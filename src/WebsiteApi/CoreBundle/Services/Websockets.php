<?php

namespace WebsiteApi\CoreBundle\Services;

use Swift_Signers_DKIMSigner;
use WebsiteApi\CoreBundle\Entity\WebsocketsRoute;

/**
 * Class TwakeMailer
 * @package WebsiteApi\CoreBundle\Services
 *
 * This class send mail with twake default template
 */
class Websockets
{

    private $doctrine;
    private $pusher;

    public function __construct($doctrine, $pusher)
    {
        $this->doctrine = $doctrine;
        $this->pusher = $pusher;

    }

    public function init($route, $data)
    {

        $routes = $this->doctrine->getRepository("TwakeCoreBundle:WebsocketsRoute");
        $route_entity = $routes->findOneBy(Array("route" => $route));

        if (!$route_entity) {
            $route_entity = new WebsocketsRoute();
            $route_entity->setRoute($route);
            $route_entity->setData($data);
        }

        $route_entity->setLastAccessDate();

        //TODO verify user has access

        $new_key_part = bin2hex(random_bytes(30));
        $new_key = hash('sha256', $route_entity->getKey() . $new_key_part);

        $route_endpoint = $route_entity->getRouteRandomEndpoint();
        $key_version = $route_entity->getKeyVersion() + 1;

        $this->push($route_endpoint, Array(
            "new_key" => $new_key_part,
            "key_version" => $key_version
        ), $route_entity);


        $route_entity->setKey($new_key);
        $this->doctrine->persist($route_entity);
        $this->doctrine->flush();

        return Array(
            "route_id" => $route_endpoint,
            "key" => $new_key,
            "key_version" => $key_version
        );

    }

    public function push($route, $event, $route_entity = null)
    {

        if (!$route_entity) {
            $routes = $this->doctrine->getRepository("TwakeCoreBundle:WebsocketsRoute");
            $route_entity = $routes->findOneBy(Array("route" => $route));
        }

        if (!$route_entity) {
            return false;
        }


        $route_endpoint = $route_entity->getRouteRandomEndpoint();
        $key_version = $route_entity->getKeyVersion();
        $key = $route_entity->getKey();

        //Encrypt event
        $salt = openssl_random_pseudo_bytes(256);
        $iv = openssl_random_pseudo_bytes(16);
        $iterations = 999;
        $prepared_key = hash_pbkdf2("sha512", $key, $salt, $iterations, 64);
        $string = json_encode($event);
        $encrypted = trim(
            base64_encode(
                openssl_encrypt(
                    $string,
                    'aes-256-cbc',
                    hex2bin($prepared_key),
                    OPENSSL_RAW_DATA,
                    $iv
                )
            )
        );

        $this->pusher->push(Array(
            "encrypted" => $encrypted,
            "iv" => bin2hex($iv),
            "salt" => bin2hex($salt),
            "key_version" => $key_version
        ), "collections/" . $route_endpoint);

    }

}
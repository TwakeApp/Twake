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

        //Register services to call for init websocekts and verify user has access
        $this->services_for_type = Array(
            "channels/direct_messages" => "app.channels.direct_messages_system",
            "channels/workspace" => "app.channels.channels_system",
            "channels/workspace_private" => "app.channels.channels_system",
            "notifications" => "app.notifications",
            "messages" => "app.messages",
            "drive" => "app.drive",
            "event" => "app.calendar.event",
            "calendar" => "app.calendar.calendar",
            "updates" => "app.user_updates"
        );

        $this->doctrine = $doctrine;
        $this->pusher = $pusher;
    }

    public function init($route, $data, $controller = null)
    {

        $routes = $this->doctrine->getRepository("TwakeCoreBundle:WebsocketsRoute");
        $route_entity = $routes->findOneBy(Array("route" => $route));

        $new = false;
        if (!$route_entity) {
            $route_entity = new WebsocketsRoute();
            $route_entity->setRoute($route);
            $route_entity->setData($data);
            $new = true;
        }

        $last_modified_date = $route_entity->getLastModifiedDate();
        $route_entity->setLastModifiedDate();
        //Be fast here (add lock ?)
        $this->doctrine->persist($route_entity);
        $this->doctrine->flush();

        $route_endpoint = $route_entity->getRouteRandomEndpoint();

        if ($new || (new \DateTime())->getTimestamp() - $last_modified_date->getTimestamp() > 60) {

            $new_key_part = bin2hex(random_bytes(30));
            $new_key = hash('sha256', $route_entity->getKey() . $new_key_part);

            $tmp = explode("-", $route_entity->getKeyVersion());
            $key_version = ((intval($tmp[0]) + 1) % 1000) . "-" . date("U") . "-" . random_int(0, 10000);

            $this->push($route_endpoint, Array(
                "new_key" => $new_key_part,
                "key_version" => $key_version
            ), $route_entity);


            $route_entity->setKey($new_key);
            $route_entity->setKeyVersion($key_version);
            $this->doctrine->persist($route_entity);
            $this->doctrine->flush();

        } else {
            $new_key = $route_entity->getKey();
            $key_version = $route_entity->getKeyVersion();
        }

        //TODO remove too old route entity and replace by new

        //Verify user has access
        if ($controller) {
            $type = $data["type"];
            if (isset($this->services_for_type[$type])) {
                $has_access = $controller->getService($this->services_for_type[$type])->init($route, $data, $controller->getUser());
                if (!$has_access) {
                    return Array();
                }
            } else {
                return Array();
            }
        }

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
            //Nobody never init this collection so nobody will receive this event
            return false;
        }

        $route_endpoint = $route_entity->getRouteRandomEndpoint();
        $key_version = $route_entity->getKeyVersion();
        $key = $route_entity->getKey();

        //Encrypt event
        $salt = openssl_random_pseudo_bytes(256);
        $iv = openssl_random_pseudo_bytes(16);
        $iterations = 9;
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
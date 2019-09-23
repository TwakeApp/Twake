<?php

namespace WebsiteApi\UsersBundle\Services;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Http\Event\InteractiveLoginEvent;
use WebsiteApi\CoreBundle\Services\Translate;
use WebsiteApi\UsersBundle\Entity\Device;
use WebsiteApi\UsersBundle\Entity\Mail;
use WebsiteApi\UsersBundle\Entity\VerificationNumberMail;
use WebsiteApi\UsersBundle\Model\UserInterface;

/**
 * This service is responsible for subscribtions, unsubscribtions, request for new password
 */
class Users
{

    private $em;
    private $list_users = Array("users" => Array(), "scroll_id" => "");


    public function __construct($em)
    {
        $this->em = $em;
    }

    public function search($options = Array())
    {
        //var_dump("passage");
        $name = $options["name"];
        //var_dump($name);

        $should = Array();

        if(isset($name)){
            $should[] = Array(
                "bool" => Array(
                    "filter" => Array(
                        "regexp" => Array(
                            "firstname" => ".*".$name.".*"
                        )
                    )
                )
            );

            $should[] = Array(
                "bool" => Array(
                    "filter" => Array(
                        "regexp" => Array(
                            "lastname" => ".*".$name.".*"
                        )
                    )
                )
            );

            $should[] = Array(
                "bool" => Array(
                    "filter" => Array(
                        "regexp" => Array(
                            "username" => ".*".$name.".*"
                        )
                    )
                )
            );
        }


        $options = Array(
            "repository" => "TwakeUsersBundle:User",
            "index" => "users",
            "size" => 10,
            "query" => Array(
                "bool" => Array(
                    "must" => Array(
                        "bool" => Array(
                            "should" => $should,
                            "minimum_should_match" => 1
                        )
                    )
                )
            ),
            "sort" => Array(
                "creation_date" => Array(
                    "order" => "desc"
                )
            )
        );


        // search in ES
        $result = $this->em->es_search($options);

        array_slice($result["result"], 0, 5);

        $scroll_id = $result["scroll_id"];

        $userRepository = $this->em->getRepository("TwakeUsersBundle:User");
        $user = $userRepository->findOneBy(Array("usernamecanonical" => substr($name)));

        if ($user) {
            $this->list_users["users"][] = $user;
        }

        //on traite les données recu d'Elasticsearch
        foreach ($result["result"] as $user){
            //var_dump($file->getAsArray());
            $this->list_users["users"][] = Array($user[0]->getAsArray(), $user[1][0]);;
        }

        $this->list_users["scroll_id"] = $scroll_id;

       return $this->list_users ?: null;
    }

    public function getById($id, $entity = false)
    {
        $userRepository = $this->em->getRepository("TwakeUsersBundle:User");
        $user = $userRepository->find($id);
        if ($user) {
            return $entity ? $user : $user->getAsArray();
        }
        return false;
    }
}

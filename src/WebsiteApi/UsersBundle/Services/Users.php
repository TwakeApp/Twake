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

    public function __construct($em)
    {
        $this->em = $em;
    }

    public function search($words, $options = Array())
    {

        if (!$words || !is_array($words)) {
            return [];
        }

        $language_preference = isset($options["language_preference"]) ? $options["language_preference"] : false;

        $terms = Array();

        foreach ($words as $word){
            $terms[] = Array("prefix" => Array("firstname" => strtolower($word)));
            $terms[] = Array("prefix" => Array("lastname" => strtolower($word)));
            $terms[] = Array("prefix" => Array("username" => strtolower($word)));
        }

        $options = Array(
            "repository" => "TwakeUsersBundle:User",
            "index" => "users",
            "query" => Array(
                "bool" => Array(
                    "should" => $terms,
                    "minimum_should_match" => 1,
                    "filter" => Array(
                        "term" => Array(
                            "banned" => false
                        )
                    )
                )
            )
        );

        //var_dump(json_encode($options));

        /*if ($language_preference) {
            $options["query"]["bool"]["should"][] = Array("match" => Array("language" => $language_preference));
        }*/

        $users = $this->em->es_search($options);

        $result = [];
        foreach ($users as $user) {
            $result[] = $user->getAsArray();
        }

        return $result;
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

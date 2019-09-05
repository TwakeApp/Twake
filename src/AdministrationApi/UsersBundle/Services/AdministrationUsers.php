<?php


namespace AdministrationApi\UsersBundle\Services;


class AdministrationUsers
{

    private $em;

    public function __construct($em)
    {
        $this->em = $em;
    }

    public function getAllUsers($limit, $offset)
    {

        $usersRepository = $this->em->getRepository("TwakeUsersBundle:User");

        $usersEnitity = $usersRepository->findBy(Array(), Array(), $limit, $offset/*, "__TOKEN__id"*/);

        $users = Array();

        foreach ($usersEnitity as $user) {
            $user_tab = $user->getAsArray();
            $user_tab['mail'] = $user->getEmail();
            $users[] = $user_tab;
        }

        return $users;
    }

    public function getOneUser($user_id) {
        try {
            $usersRepository = $this->em->getRepository("TwakeUsersBundle:User");

            $user = $usersRepository->find($user_id);

            return $user;

        } catch (Exception $e) {
            return "Error";
        }
    }

    public function getUserDevices($user)
    {
        $devicesRepository = $this->em->getRepository("TwakeUsersBundle:Device");

        $devices_tab = $devicesRepository->findBy(Array("user" => $user));

        $devices = array();

        foreach ($devices_tab as $device) {
            $devices[] = $device->getAsArray();
        }

        return $devices;
    }

    public function getUserWorkspaces($user)
    {
        $workspacesRepository = $this->em->getRepository("TwakeWorkspacesBundle:WorkspaceUser");

        $workspaces_tab = $workspacesRepository->findBy(Array("user" => $user));

        $workspaces = array();

        foreach ($workspaces_tab as $workspace) {
            $workspaces[] = $workspace->getWorkspace()->getAsArray();
        }

        return $workspaces;
    }

    public function getUserMails($user)
    {
        $mailsRepository = $this->em->getRepository("TwakeUsersBundle:Mail");

        $mails_tab = $mailsRepository->findBy(Array("user" => $user));

        $mails = array();

        foreach ($mails_tab as $mail) {
            $mails[] = $mail->getMail();
        }

        return $mails;
    }

    public function getUserGroups($user)
    {
        $groupsRepository = $this->em->getRepository("TwakeWorkspacesBundle:GroupUser");

        $groups_tab = $groupsRepository->findBy(Array("user" => $user));

        $groups = array();

        foreach ($groups_tab as $group) {
            $groups[] = $group->getGroup()->getAsArray();
        }

        return $groups;
    }

    public function findUserByUsername($username) {

        $usersRepository = $this->em->getRepository("TwakeUsersBundle:User");

        $users = $usersRepository->findBy(Array("usernamecanonical" => $username));

        $rep = false;

        if (count($users) >= 1) {
            $rep = array();

            foreach ($users as $user) {
                $user_tab = $user->getAsArray();
                $user_tab['mail'] = $user->getEmail();
                $rep[] = $user_tab;
            }
        }

        return $rep;

    }

    public function findUserByEmail($email) {
        $mailsRepository = $this->em->getRepository("TwakeUsersBundle:Mail");

        $usersMails = $mailsRepository->findBy(array("mail" => $email));

        $rep = false;

        if (count($usersMails) >= 1) {
            $rep = array();

            foreach ($usersMails as $mail) {
                $user = $mail->getUser();
                $user_tab = $user->getAsArray();
                $user_tab['mail'] = $user->getEmail();
                $rep[] = $user_tab;
            }
        }

        return $rep;
    }

    public function findUserById($id) {

        $usersRepository = $this->em->getRepository("TwakeUsersBundle:User");

        $users = $usersRepository->findBy(Array("id" => $id));

        $rep = false;

        if (count($users) >= 1) {
            $rep = array();

            foreach ($users as $user) {
                $user_tab = $user->getAsArray();
                $user_tab['mail'] = $user->getEmail();
                $rep[] = $user_tab;
            }
        }

        return $rep;

    }

    public function getUserbyMail($options)
    {

        if (isset($options["mail"])) {
            $mail = $options["mail"];

            //var_dump("passage");

            $options = Array(
                "repository" => "TwakeUsersBundle:Mail",
                "index" => "mail",
                "size" => 10,
                "query" => Array(
                    "bool" => Array(
                        "should" => Array(
                            "bool" => Array(
                                "filter" => Array(
                                    "regexp" => Array(
                                        "mail" => ".*".$mail.".*"
                                    )
                                )
                            )
                        )
                    )
                ),
            );
        }

//        $mail = new Mail();
//        $mail->setMail("romaric@twakemail.fr");
//        $this->em->persist($mail);
//        $this->em->flush();

        // search in ES
        $result = $this->em->es_search($options);


        array_slice($result["result"], 0, 5);

        $scroll_id = $result["scroll_id"];

        //on traite les données recu d'Elasticsearch
        //var_dump(json_encode($options));
        foreach ($result["result"] as $mail){
            //var_dump($file->getAsArray());
            $this->list_group["group"][]= $mail->getUser()
                ->getAsArray();
        }
//        var_dump("nombre de resultat : " . count($this->list_files));
//        var_dump($this->list_group);
        $this->list_group["scroll_id"] = $scroll_id;

        return $this->list_group ?: null;
    }

}

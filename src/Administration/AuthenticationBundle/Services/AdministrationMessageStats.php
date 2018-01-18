<?php
/**
 * Created by PhpStorm.
 * User: founski
 * Date: 17/01/18
 * Time: 10:47
 */

namespace Administration\AuthenticationBundle\Services;


use Administration\AuthenticationBundle\Model\AdministrationMessageStatsInterface;
use Administration\AuthenticationBundle\Entity\UserDailyStats;
use Symfony\Component\Validator\Constraints\DateTime;

class AdministrationMessageStats implements AdministrationMessageStatsInterface
{
    public function __construct($doctrine)
    {
        $this->doctrine = $doctrine;
    }

    //countDailyMessage count the number of messages sent by the $idTwakeUser
    public function countDailyMessage($idTwakeUser){
        $repository = $this->doctrine->getRepository("TwakeUsersBundle:UserStats");
        $twakeUserStat =  $repository->findOneBy(Array("user"=>$idTwakeUser));
        if($twakeUserStat == null){
            return null;
        }
        $userDailyStats = new UserDailyStats();
        $userDailyStats->setUser($twakeUserStat->getUser());
        $userDailyStats->setPublicMsgCount($twakeUserStat->getPublicMsgCount());
        $userDailyStats->setPrivateMsgCount($twakeUserStat->getPrivateMsgCount());
        $userDailyStats->setDate(new \DateTime("now"));
        $this->doctrine->persist($userDailyStats);
        $this->doctrine->flush();
    }

    public function countPublicMessage($idTwakeUser,$startdate,$enddate){
        $repository = $this->doctrine->getRepository("AdministrationAuthenticationBundle:UserDailyStats");
        $twakeUserStat =  $repository->getStatsPublicMessage($idTwakeUser,$startdate,$enddate);
        if($twakeUserStat == null){
            return 0;
        }
        return $twakeUserStat;
    }

    public function countPrivateMessage($idTwakeUser,$startdate,$enddate){
        $repository = $this->doctrine->getRepository("AdministrationAuthenticationBundle:UserDailyStats");
        $twakeUserStat =  $repository->getStatsPrivateMessage($idTwakeUser,$startdate,$enddate);
        if($twakeUserStat == null){
            return null;
        }
        return $twakeUserStat;
    }


    public function numberOfMessagePrivateByUserByWorkspace($idWorkSpace){

        $repository = $this->doctrine->getRepository("TwakeWorkspaceBundle:Workspace");
        $twakeUser =  $repository->findOneBy(Array("id"=>$idWorkSpace))->getMembers();
        $repository = $this->doctrine->getRepository("TwakeUserBundle:UserStat");
        $sum = 0;
        foreach ($twakeUser as $user){
            $sum += $repository->findOneBy(Array("id"=>$user))->getPrivateMsgCount();
        }
        return $sum;

    }

    public function numberOfMessagePublicByWorkspace($idWorkSpace){
        $repository = $this->doctrine->getRepository("TwakeUserBundle:UserStats");

    }

}
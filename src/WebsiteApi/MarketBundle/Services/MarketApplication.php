<?php

namespace WebsiteApi\MarketBundle\Services;

use WebsiteApi\MarketBundle\Model\MarketApplicationInterface;
use WebsiteApi\WorkspacesBundle\Entity\GroupApp;

class MarketApplication implements MarketApplicationInterface
{
    private $doctrine;
    private $gms;

    public function __construct($doctrine, $group_managers_service)
    {
        $this->doctrine = $doctrine;
        $this->gms = $group_managers_service;
    }

    public function getApps()
    {
        $applicationRepository = $this->doctrine->getRepository("TwakeMarketBundle:Application");
        $applications = $applicationRepository->findBy(Array(),array('name' => 'ASC'), 50);

        return $applications;
    }
    public function getAppsByName($name)
    {
        $applicationRepository = $this->doctrine->getRepository("TwakeMarketBundle:Application");
        $applications = $applicationRepository->findApplicationByName($name);

        return $applications;
    }

    public function addApplication($groupId,$appId, $currentUserId = null){

        if($groupId == null || $appId == null){
            return false;
        }

        $groupRepository = $this->doctrine->getRepository("TwakeWorkspacesBundle:Group");
        $group = $groupRepository->find($groupId);

        $applicationRepository = $this->doctrine->getRepository("TwakeMarketBundle:Application");
        $application = $applicationRepository->find($appId);


        if ($currentUserId == null
            || $this->gms->hasPrivileges(
                $this->gms->getLevel($groupId, $currentUserId),
                "MANAGE_APPS"
            )
        ) {
            $groupapp = new GroupApp($group, $application);
            $this->doctrine->persist($groupapp);

            $this->doctrine->flush();

            return true;
        }
        return false ;
    }
}
<?php

namespace WebsiteApi\GlobalSearchBundle\Services;

use WebsiteApi\GlobalSearchBundle\Entity\Bloc;
use WebsiteApi\DiscussionBundle\Entity\Message;
use WebsiteApi\DriveBundle\Entity\DriveFile;


class Search
{
    private $doctrine;
    private $blocservice;
    private $fileservice;

    public function __construct($doctrine, $blocservice, $fileservice)
    {
        $this->doctrine = $doctrine;
        $this->blocservice = $blocservice;
        $this->fileservice = $fileservice;
    }

    public function GlobalSearch(){

        $words = Array("appli","données");
        $globalresult = Array();
//        $messages = $this->blocservice->SearchMessage($words);
//        $files = $this->fileservice->SearchFile($words);
    }

}
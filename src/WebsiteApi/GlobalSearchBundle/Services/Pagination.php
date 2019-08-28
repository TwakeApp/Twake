<?php

namespace WebsiteApi\GlobalSearchBundle\Services;

use WebsiteApi\GlobalSearchBundle\Entity\Bloc;
use WebsiteApi\DiscussionBundle\Entity\Message;

class Pagination

{
    private $doctrine;

    public function __construct($doctrine)
    {
        $this->doctrine = $doctrine;
    }

    public function getnextelement($scroll_id, $repository){

        $option = Array(
          "scroll_id" => $scroll_id,
          "repository" => $repository
        );
        $result = $this->doctrine->es_search($option);
        return $result;

    }
}
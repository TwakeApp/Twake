<?php

namespace WebsiteApi\MarketBundle\Repository;

/**
 * LinkAppWorkspaceRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class LinkAppWorkspaceRepository extends \Doctrine\ORM\EntityRepository
{
    public function countWorkspaceByApp($idApp){
        $req = $this->createQueryBuilder('A')
            ->select('count(A.id)');
        $req->where('A.application = \'' . $idApp.'\'');
        return $req->getQuery()->getSingleScalarResult();
    }
}
<?php

namespace WebsiteApi\MarketBundle\Repository;

/**
 * ApplicationRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class ApplicationRepository extends \Doctrine\ORM\EntityRepository
{

    public function findApplicationByName($name)
    {
        // automatically knows to select Products
        // the "p" is an alias you'll use in the rest of the query
        $qb = $this->createQueryBuilder('p')
            ->andWhere('p.name like :name')
            ->setParameter('name', '%'.$name.'%')
            ->orderBy('p.name', 'ASC')
            ->getQuery();

        return $qb->execute();
    }
}
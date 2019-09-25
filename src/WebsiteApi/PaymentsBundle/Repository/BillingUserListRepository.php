<?php

namespace WebsiteApi\PaymentsBundle\Repository;

/**
 * BillingUserListRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class BillingUserListRepository extends \WebsiteApi\CoreBundle\Services\DoctrineAdapter\RepositoryAdapter
{

    public function removeUser($user){
        $qb = $this->createQueryBuilder('u');
        $qb->delete();
        $qb->where('u.user = :user');
        $qb->setParameter('user', $this->queryBuilderUuid($user));
        $qb->getQuery()->execute();
    }
}

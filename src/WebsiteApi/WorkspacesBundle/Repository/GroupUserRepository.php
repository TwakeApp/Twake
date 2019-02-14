<?php

namespace WebsiteApi\WorkspacesBundle\Repository;
use Doctrine\Common\Collections\Criteria;



/**
 * GroupUserRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class GroupUserRepository extends \WebsiteApi\CoreBundle\Services\DoctrineAdapter\RepositoryAdapter
{

    public function getManagers($group)
    {
       $criteria = Criteria::create();
       $criteria->where(Criteria::expr()->eq('group', $group));
       $criteria->andWhere(Criteria::expr()->neq('level', 0));
       return  $this->matching( $criteria);
    }

    public function getUsers($group,$limit,$offset, $restrict = true)
    {
        $criteria = Criteria::create();
        if ($restrict){
            $criteria->setMaxResults($limit);
            $criteria->setFirstResult($offset);
        }
        $criteria->where(Criteria::expr()->eq('group', $group));
        $criteria->andWhere(Criteria::expr()->neq('nbWorkspace', 0));
        return  $this->matching( $criteria);
    }

    public function getExternalUsers($group,$limit,$offset)
    {
        $criteria = Criteria::create();
        $criteria->setMaxResults($limit);
        $criteria->setFirstResult($offset);
        $criteria->where(Criteria::expr()->eq('group', $group));
        $criteria->andWhere(Criteria::expr()->neq('nbWorkspace', 0));
        $criteria->andWhere(Criteria::expr()->eq('externe', true));
        return  $this->matching( $criteria);
    }

    public function findOneBy(array $array)
    {
        return parent::findOneBy($array);
    }
}

<?php

namespace WebsiteApi\CoreBundle\Services\DoctrineAdapter;

class ManagerAdapter
{

    public function __construct($doctrine_manager)
    {
        $this->manager = $doctrine_manager;
    }

    public function getManager()
    {
        return $this;
    }

    public function clear()
    {
        return $this->manager->clear();
    }

    public function flush()
    {
        try {
            $a = $this->manager->flush();
        } catch (\Exception $e) {
            error_log($e);
            die("ERROR with flush");
        }
        return $a;
    }

    public function remove($object)
    {
        return $this->manager->remove($object);
    }

    public function persist($object)
    {
        return $this->manager->persist($object);
    }

    public function getRepository($name)
    {
        return $this->manager->getRepository($name);
    }

    public function createQueryBuilder($qb = null)
    {
        return $this->manager->createQueryBuilder($qb);
    }

}

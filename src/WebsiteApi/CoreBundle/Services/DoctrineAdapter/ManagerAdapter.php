<?php

namespace WebsiteApi\CoreBundle\Services\DoctrineAdapter;

use Reprovinci\DoctrineEncrypt\Subscribers\DoctrineEncryptSubscriber;
use WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\DriverManager;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\Repository\DefaultRepositoryFactory;
use Doctrine\ORM\Tools\Setup;
use Doctrine\DBAL\Types\Type;
use Ramsey\Uuid\Doctrine\UuidOrderedTimeGenerator;

class ManagerAdapter
{

    public function __construct($doctrine_manager, $es_server, $circle, $driver, $host, $port, $username, $password, $dbname, $encryption_key)
    {
        $this->doctrine_manager = $doctrine_manager;
        $this->database_configuration = Array(
            "driver" => $driver,
            "host" => $host,
            "port" => $port,
            "username" => $username,
            "password" => $password,
            "dbname" => $dbname,
            "encryption_key" => $encryption_key
        );
        $this->dev_mode = true; // If false no entity generation
        $this->manager = null;

        $this->circle = $circle;
        $this->es_server = $es_server;
        $this->es_updates = Array();
        $this->es_removes = Array();
        $this->generator = null;
    }

    public function getEntityManager()
    {

        if ($this->manager) {
            return $this->manager;
        }

        if ($this->database_configuration["driver"] == "pdo_mysql") {
            $driver_type = "Mysql";
        } else {
            $driver_type = "Cassandra";
        }

        $paths = array(__DIR__ . "/../../../");
        $isDevMode = $this->dev_mode;
        $config = Setup::createAnnotationMetadataConfiguration($paths, $isDevMode, null, null, false);
        $conn = DriverManager::getConnection(Array(
            'driver' => $this->database_configuration["driver"],
            'host' => $this->database_configuration["host"],
            'port' => $this->database_configuration["port"],
            'dbname' => $this->database_configuration["dbname"],
            'user' => $this->database_configuration["username"],
            'password' => $this->database_configuration["password"],
            'twake_types' => Array(
                'twake_float' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'FloatType',
                'twake_datetime' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'DateTimeType',
                'twake_timeuuid' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'TimeUUIDType',
                'twake_boolean' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'BooleanType',
                'twake_text' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'TextType',
                'twake_string' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'StringType',
                'twake_bigint' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'BigIntType'
            )
        ), $config);

        $encryptedStringType = Type::getType('twake_text');
        $encryptedStringType->setEncryptionKey(pack("H*", $this->database_configuration["encryption_key"]));

        $entityManager = EntityManager::create($conn, $config);

        //Database encryption
        /*$encrypt_subscriber = new TwakeDoctrineEncryptSubscriber(
            new \Doctrine\Common\Annotations\AnnotationReader,
            new TwakeEncryptor(pack("H*", $this->database_configuration["encryption_key"]))
        );
        $eventManager = $entityManager->getEventManager();
        $eventManager->addEventSubscriber($encrypt_subscriber);*/

        $this->manager = $entityManager;
        return $this->manager;
    }

    public function getManager()
    {
        return $this->getEntityManager();
    }

    public function clear()
    {
        return $this->getEntityManager()->clear();
    }

    /** !Caution! : thin ttl will be used on the first insert in the next flush ! */
    public function useTTLOnFirstInsert($ttl)
    {
        $this->getManager()->getConnection()->getWrappedConnection()->useTTLOnFirstInsert($ttl);
    }

    public function flush()
    {
        //ElasticSearch
        foreach ($this->es_removes as $es_remove) {
            $this->es_remove($es_remove, $es_remove->getEsType(), $es_remove->getEsIndex());
        }
        $this->es_removes = Array();
        foreach ($this->es_updates as $id => $es_update) {
            $this->es_put($es_update, $es_update->getEsType(), $es_update->getEsIndex());
            $es_update->updatePreviousIndexationArray();
        }
        $this->es_updates = Array();

        try {
            $a = $this->manager->flush();
        } catch (\Exception $e) {
            error_log($e);
            error_log("ERROR FLUSH");
            die("ERROR with flush");
        }

        return $a;
    }

    public function remove($object)
    {
        if (method_exists($object, "getEsIndexed")) {
            //This is a searchable object
            $this->es_removes[$object->getId() . ""] = $object;
            unset($this->es_updates[$object->getId() . ""]);
        }
        return $this->getEntityManager()->remove($object);
    }

    public function persist($object)
    {


        if (!$this->generator) {
            $this->generator = new UuidOrderedTimeGenerator();
        }

        if (method_exists($object, "getId") && (!$object->getId() || (is_object($object->getId()) && method_exists($object->getId(), "isNull") && $object->getId()->isNull()))) {
            $object->setId($this->generator->generate($this->getEntityManager(), $object));
            //error_log($object->getId());
        }


        if (method_exists($object, "getEsIndexed")) {
            //This is a searchable object
            if (method_exists($object,"getLock()") ){
                if($object->getLock() == true) {
                    $this->es_updates[$object->getId() . ""] = $object;
                    unset($this->es_removes[$object->getId() . ""]);
                    $object->setEsIndexed(true);
                }
            }
            else{
                if (!$object->getEsIndexed() || $object->changesInIndexationArray()) {
                    $this->es_updates[$object->getId() . ""] = $object;
                    unset($this->es_removes[$object->getId() . ""]);
                    $object->setEsIndexed(true);
                }
            }
        }


        $res = null;
        try {
            $res = $this->getEntityManager()->persist($object);
        } catch (\Exception $e) {
            error_log($e);
            die("ERROR with persist");
        }

        return $res;
    }

    public function getRepository($name)
    {
        $metadata = $this->doctrine_manager->getClassMetadata($name);
        $name = $metadata->getName();
        $em = $this->getEntityManager();
        $factory = new DefaultRepositoryFactory($em, $name);
        return $factory->getRepository($em, $name);
    }

    public function createQueryBuilder($qb = null)
    {
        return $this->getEntityManager()->createQueryBuilder($qb);
    }


    /* Elastic Search */


    public function es_put($entity, $index, $server = "twake")
    {

        if (is_array($entity)) {
            $id = $entity["id"];
            $data = $entity["data"];
            if (!is_array($data)) {
                $data = Array("content" => $data);
            }
        } else {

            $id = $entity->getId();
            if (method_exists($entity, "getIndexationArray")) {
                $data = $entity->getIndexationArray();
            } else {
                $data = $entity->getAsArray();
            }
        }
        $route = "http://" . $this->es_server . "/" . $index . "/_doc/" . $id;


        try {
//            var_dump($route);
            //var_dump(json_encode($data));
//            error_log("update es : " . $route);
//            error_log(json_encode($data));
            $this->circle->put($route, json_encode($data), array(CURLOPT_CONNECTTIMEOUT => 1, CURLOPT_HTTPHEADER => ['Content-Type: application/json']));
        } catch (\Exception $e) {
            error_log("Unable to put on ElasticSearch.");
        }

    }

    public function es_remove($entity, $index, $server = "twake")
    {

        if (is_array($entity)) {
            $id = $entity["id"];
        } else {
            $id = $entity->getId();
        }

        $route = "http://" . $this->es_server . "/" . $index . "/_doc/" . $id;

        try {
            $this->circle->delete($route, array(CURLOPT_CONNECTTIMEOUT => 1));
        } catch (\Exception $e) {
            error_log("Unable to delete on ElasticSearch.");
        }
    }

    public function es_search($options = Array(), $index = null, $server = "twake")
    {

        if (isset($options["index"]) && !$type) {
            $index = $options["index"];
        }

        $repository = null;
        if (isset($options["repository"])) {
            $repository = $this->getRepository($options["repository"]);
        }

        $route = "http://" . $this->es_server . "/" . $index . "/_doc/";
        $route .= "_search";

        try {
            if( isset($options["sort"])){
                $res = $this->circle->post($route, json_encode(Array("query" => $options["query"],"sort"=>$options["sort"])), array(CURLOPT_CONNECTTIMEOUT => 1, CURLOPT_HTTPHEADER => ['Content-Type: application/json']));
            }
            else{
                $res = $this->circle->post($route, json_encode(Array("query" => $options["query"])), array(CURLOPT_CONNECTTIMEOUT => 1, CURLOPT_HTTPHEADER => ['Content-Type: application/json']));
            }

        } catch (\Exception $e) {
            error_log("Unable to post on ElasticSearch.");
        }


        $res = $res->getContent();

//        var_dump($route);
//        var_dump($res);

        $result = [];
        if ($res) {
            $res = json_decode($res, 1);


            if (isset($res["hits"]) && isset($res["hits"]["hits"])) {
                $res = $res["hits"]["hits"];
                foreach ($res as $object_json) {
                    if ($repository) {
                        $obj = $repository->findOneBy(Array("id" => $object_json["_id"]));
                    } else {
                        $obj = $object_json["_id"];
                    }
                    if ($obj) {
                        $result[] = $obj;
                    }
                }
            }

        }
        return $result;

    }

//    public function es_search_perso($options = Array(), $index = null, $server = "twake")
//    {
//
//        if (isset($options["index"]) && !$type) {
//            $index = $options["index"];
//
//        }
//
//        $repository = null;
//        if (isset($options["repository"])) {
//            $repository = $this->getRepository($options["repository"]);
//        }
//
//        $route = "http://" . $this->es_server . "/" . $index . "/_doc/";
//        $route .= "_search";
//        try {
//            //$res = $this->circle->post($route, json_encode(Array("query" => $options["query"],"sort"=>$options["sort"])), array(CURLOPT_CONNECTTIMEOUT => 1, CURLOPT_HTTPHEADER => ['Content-Type: application/json']));
//            $res = $this->circle->post($route, json_encode(Array("query" => $options["query"])), array(CURLOPT_CONNECTTIMEOUT => 1, CURLOPT_HTTPHEADER => ['Content-Type: application/json']));
//
//        } catch (\Exception $e) {
//            error_log("Unable to post on ElasticSearch.");
//        }
//
//        $res = $res->getContent();
//        $result = [];
//        if ($res) {
//            $res = json_decode($res, 1);
//
//            if (isset($res["hits"]) && isset($res["hits"]["hits"])) {
//                $res = $res["hits"]["hits"];
//                foreach ($res as $object_json) {
//                    if ($repository) {
//                        $obj = $repository->findOneBy(Array("id" => $object_json["_id"]));
//                    } else {
//                        $obj = $object_json["_id"];
//                    }
//                    if ($obj) {
//                        $result[] = $obj;
//                    }
//                }
//            }
//
//        }
//       return $result;
//
//    }
//
//    public function es_put_perso($options = Array(), $index=null, $server = "twake")
//    {
//        if (isset($options["index"]) && !$type) {
//            $index = $options["index"];
//        }
//        if (is_array($entity)) {
//            $id = $entity["id"];
//            $data = $entity["data"];
//
//            if (!is_array($data)) {
//                $data = Array("content" => $data);
//            }
//        } else {
//            $id = $entity->getId();
//
//            if (method_exists($entity, "getIndexationArray")) {
//                $data = $entity->getIndexationArray();
//            } else {
//                $data = $entity->getAsArray();
//            }
//        }
//
//
//        $data = $options["data"];
//        $route = "http://" . $this->es_server . "/" . $index . "/_doc/" . $options["data"]["id"];
//        error_log(print_r($route,true));
//        error_log(print_r($data,true));
//
//        try {
//            $this->circle->put($route, json_encode($data), array(CURLOPT_CONNECTTIMEOUT => 1, CURLOPT_HTTPHEADER => ['Content-Type: application/json']));
//        } catch (\Exception $e) {
//            error_log("Unable to put on ElasticSearch.");
//        }
//
//    }


}

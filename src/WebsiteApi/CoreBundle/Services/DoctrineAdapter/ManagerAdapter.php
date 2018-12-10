<?php

namespace WebsiteApi\CoreBundle\Services\DoctrineAdapter;

use Reprovinci\DoctrineEncrypt\Subscribers\DoctrineEncryptSubscriber;
use WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\DriverManager;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\Repository\DefaultRepositoryFactory;
use Doctrine\ORM\Tools\Setup;
use Doctrine\DBAL\Types\Type;

class ManagerAdapter
{

    public function __construct($doctrine_manager, $driver, $host, $port, $username, $password, $dbname, $encryption_key)
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
                'twake_text' => 'WebsiteApi\CoreBundle\Services\DoctrineAdapter\DBAL\Types\\' . $driver_type . 'TextType'
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
        return $this->getEntityManager()->remove($object);
    }

    public function persist($object)
    {
        return $this->getEntityManager()->persist($object);
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

}

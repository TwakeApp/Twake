<?php

namespace Twake\Users\Entity;

use Symfony\Component\Security\Core\User\UserInterface;
use Twake\Core\Entity\SearchableObject;
use Twake\Workspaces\Entity\LinkWorkspaceParent;
use Symfony\Component\Security\Core\User\UserInterface as BaseUserInterface;
use Doctrine\ORM\Mapping as ORM;


/**
 * ExternalUserRepository
 *
 * @ORM\Table(name="external_user_repository",options={"engine":"MyISAM", "scylladb_keys": {{"service_id":"ASC", "external_id":"ASC"}} })
 * @ORM\Entity()
 */
class ExternalUserRepository
{

    /**
     * @var int
     *
     * @ORM\Column(name="service_id", type="string")
     * @ORM\Id
     */
    protected $service_id;

    /**
     * @var int
     *
     * @ORM\Column(name="external_id", type="string")
     * @ORM\Id
     */
    protected $external_id;

    /**
     * @ORM\Column(type="twake_timeuuid")
     */
    protected $user_id;

    /**
     * ExternalUserRepository constructor.
     * @param int $service_id
     * @param int $external_id
     * @param $user_id
     */
    public function __construct(int $service_id, int $external_id, $user_id)
    {
        $this->service_id = $service_id;
        $this->external_id = $external_id;
        $this->user_id = $user_id;
    }

    /**
     * @return int
     */
    public function getServiceId(): int
    {
        return $this->service_id;
    }

    /**
     * @return int
     */
    public function getExternalId(): int
    {
        return $this->external_id;
    }

    /**
     * @return mixed
     */
    public function getUserId()
    {
        return $this->user_id;
    }

}

<?php

namespace WebsiteApi\WorkspacesBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Reprovinci\DoctrineEncrypt\Configuration\Encrypted;


/**
 * WorkspaceUser
 *
 * @ORM\Table(name="workspace_user",options={"engine":"MyISAM", "scylladb_keys": {{"workspace_id", "user_id", "id"}, {"level_id"}, {"user_id"}}, "scylladb_order": {"user_id": "DESC"} })
 * @ORM\Entity(repositoryClass="WebsiteApi\WorkspacesBundle\Repository\WorkspaceUserRepository")
 */
class WorkspaceUser
{

    /**
     * @var int
     *
     * @ORM\Column(name="id", type="twake_timeuuid")
     * @ORM\Id
     */
    private $id;

	/**
     * @ORM\ManyToOne(targetEntity="WebsiteApi\WorkspacesBundle\Entity\Workspace")
     * @ORM\Id
	 */
	private $workspace;

	/**
     * @ORM\ManyToOne(targetEntity="WebsiteApi\UsersBundle\Entity\User")
     * @ORM\Id
	 */
	private $user;

	/**
     * @ORM\ManyToOne(targetEntity="WebsiteApi\WorkspacesBundle\Entity\WorkspaceLevel")
	 */
	private $level;

    /**
     * @ORM\Column(type="twake_datetime")
     */
    private $date_added;

    /**
     * @ORM\Column(type="twake_datetime", options={"default" : "1970-01-02"})
     */
    private $last_access;

    /**
     * @ORM\Column(type="twake_boolean")
     */
    private $ishidden = false;

    /**
     * @ORM\Column(type="twake_boolean")
     */
    private $isfavorite = false;

    /**
     * @ORM\Column(type="twake_boolean")
     */
    private $hasnotifications = true;

	public function __construct($workspace, $user, $level) {
		$this->workspace = $workspace;
		$this->user = $user;

		$this->level = $level;
		$this->date_added = new \DateTime();
        $this->last_access = new \DateTime();
	}

	/**
	 * @return int
	 */
    public function setId($id)
    {
        $this->id = $id;
    }

    public function getId()
	{
		return $this->id;
	}

	/**
	 * @return mixed
	 */
	public function getWorkspace()
	{
		return $this->workspace;
	}

	/**
	 * @return mixed
	 */
	public function getUser()
	{
		return $this->user;
	}

	/**
	 * @return mixed
	 */
	public function getLevel()
	{
		return $this->level;
	}

	/**
	 * @param mixed $level
	 */
	public function setLevel($level)
	{
		$this->level = $level;
	}

	/**
	 * @return mixed
	 */
	public function getDateAdded()
	{
		return $this->date_added;
	}

    /**
     * @return mixed
     */
    public function getLastAccess()
    {
        return $this->last_access;
    }

    /**
     * @param mixed $last_access
     */
    public function setLastAccess()
    {
        $this->last_access = new \DateTime();
    }

    /**
     * @return mixed
     */
    public function getisHidden()
    {
        return $this->ishidden;
    }

    /**
     * @param mixed $ishidden
     */
    public function setIsHidden($ishidden)
    {
        $this->ishidden = $ishidden;
    }

    /**
     * @return mixed
     */
    public function getisFavorite()
    {
        return $this->isfavorite;
    }

    /**
     * @param mixed $isfavorite
     */
    public function setIsFavorite($isfavorite)
    {
        $this->isfavorite = $isfavorite;
    }

    /**
     * @return mixed
     */
    public function getHasNotifications()
    {
        return $this->hasnotifications;
    }

    /**
     * @param mixed $hasnotifications
     */
    public function setHasNotifications($hasnotifications)
    {
        $this->hasnotifications = $hasnotifications;
    }


}

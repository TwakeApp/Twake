<?php

namespace WebsiteApi\WorkspacesBundle\Entity;

use Doctrine\ORM\Mapping as ORM;




/**
 * WorkspacesActivities
 *
 * @ORM\Table(name="workspace_activity",options={"engine":"MyISAM"})
 * @ORM\Entity(repositoryClass="WebsiteApi\WorkspacesBundle\Repository\WorkspaceActivityRepository")
 */
class WorkspaceActivity
{

    /**
     * @var int
     *
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;

	/**
	 * @ORM\ManyToOne(targetEntity="WebsiteApi\WorkspacesBundle\Entity\Workspace")
	 */
	private $workspace;

	/**
	 * @ORM\ManyToOne(targetEntity="WebsiteApi\UsersBundle\Entity\User")
	 */
	private $user;

    /**
     * @ORM\ManyToOne(targetEntity="WebsiteApi\MarketBundle\Entity\Application")
     */
    private $app;

	/**
	 * @ORM\Column(type="datetime")
	 */
	private $date_added;

    /**
     * @ORM\Column(type="string")
     */
    private $title;

    /**
     * @ORM\Column(type="string")
     */
    private $objectRepository;

    /**
     * @ORM\Column(type="integer")
     */
    private $objectId;

	public function __construct($workspace, $user, $app, $title, $objectRepository, $objectId) {
		$this->workspace = $workspace;
		$this->date_added = new \DateTime();
		$this->user = $user;
		$this->app = $app;
		$this->title = $title;
		$this->objectRepository = $objectRepository;
		$this->objectId = $objectId;
	}

	/**
	 * @return int
	 */
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
	public function getDateAdded()
	{
		return $this->date_added;
	}

}

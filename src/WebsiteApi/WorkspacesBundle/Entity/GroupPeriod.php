<?php

namespace WebsiteApi\WorkspacesBundle\Entity;

use Doctrine\ORM\Mapping as ORM;


/**
 * GroupPeriod
 *
 * @ORM\Table(name="group_period",options={"engine":"MyISAM"})
 * @ORM\Entity(repositoryClass="WebsiteApi\WorkspacesBundle\Repository\GroupPeriodRepository")
 */
class GroupPeriod
{

    /**
     * @var int
     *
     * @ORM\Column(name="id", type="cassandra_timeuuid")
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="UUID")
     */
    private $id;

	/**
	 * @ORM\ManyToOne(targetEntity="WebsiteApi\WorkspacesBundle\Entity\Group")
	 */
	private $group;

    /**
     * @ORM\Column(name="connexions", type="string", length=100000)
     */
    protected $connexions;

    /**
     * @ORM\Column(name="app_usage", type="string", length=100000)
     */
    protected $appsUsage;

	/**
	 * @ORM\Column(type="datetime")
	 */
	private $periodStartedAt;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $periodEndedAt;

    /**
     * @ORM\Column(type="datetime")
     */
    private $periodExpectedToEndAt;

    /**
     * @ORM\ManyToOne(targetEntity="WebsiteApi\WorkspacesBundle\Entity\GroupPricingInstance")
     */
    private $groupPricingInstance;

    /**
     * @ORM\Column(name="current_cost", type="decimal", precision=65, scale=3)
     */
    protected $currentCost;

    /**
     * @ORM\Column(name="expected_cost", type="decimal" , precision=15, scale=3)
     */
    protected $expectedCost;

    /**
     * @ORM\Column(name="estimated_cost", type="decimal", precision=15, scale=3)
     */
    protected $estimatedCost;

	public function __construct($group) {
		$this->group = $group;
		$this->connexions = "{}";
        $this->appsUsage = "{}";
		$this->periodStartedAt = new \DateTime();
        $this->periodEndedAt = null;
        $datefin = new \DateTime();
        $datefin->modify('+1 month');
        $this->periodExpectedToEndAt = $datefin;
        $this->groupPricingInstance = null;
        $this->currentCost = 0;
        $this->estimatedCost = 0;
        $this->expectedCost= 0;
	}

	public function getAsArray(){
	    return Array(
	        "groupId" => $this->group->getId(),
            "connexions" => $this->getConnexions(),
            "appsUsage" => $this->getAppsUsagePeriod(),
            "periodStartedAt" => $this->periodStartedAt ,
            "periodEndedAt" => $this->periodEndedAt,
            "periodExpectedToEndAt" => $this->periodExpectedToEndAt,
            "groupPricingInstanceId" => $this->groupPricingInstance==null ?  null : $this->groupPricingInstance->getId(),
            "currentCost" => $this->currentCost,
            "estimatedCost" => $this->estimatedCost,
            "expectedCost" => $this->expectedCost
        );
    }


    public function isEquivalentTo($group_period){
        /*var_dump("Connexions");
	    var_dump($this->getConnexions());
        var_dump($group_period->getConnexions());
        */if ($this->getConnexions() != $group_period->getConnexions()) {
            return false;
        }
        /*var_dump("Apps");
        var_dump($this->getAppsUsagePeriod());
        var_dump($group_period->getAppsUsagePeriod());
        */if ($this->getAppsUsagePeriod() != $group_period->getAppsUsagePeriod()) {
            return false;
        }
        /*var_dump("Period start");
        var_dump($this->getPeriodStartedAt());
        var_dump($group_period->getPeriodStartedAt());
        */if ($this->getPeriodStartedAt() != $group_period->getPeriodStartedAt()) {
            return false;
        }
        /*var_dump("Period expected to end");
        var_dump($this->getPeriodExpectedToEndAt());
        var_dump($group_period->getPeriodExpectedToEndAt());
        */if ($this->getPeriodExpectedToEndAt() != $group_period->getPeriodExpectedToEndAt()) {
            return false;
        }
        /*var_dump("Current cost");
        var_dump($this->getCurrentCost());
        var_dump($group_period->getCurrentCost());
        */if ($this->getCurrentCost() != $group_period->getCurrentCost()) {
            return false;
        }
        /*var_dump("Expected cost");
        var_dump($this->getExpectedCost());
        var_dump($group_period->getExpectedCost());
        */if ($this->getExpectedCost() != $group_period->getExpectedCost()) {
            return false;
        }
        /*var_dump("Estimated cost");
        var_dump($this->getEstimatedCost());
        var_dump($group_period->getEstimatedCost());
        */if ($this->getEstimatedCost() != $group_period->getEstimatedCost()) {
            return false;
        }
        return true;
    }


    /**
     * @return mixed
     */
    public function getGroup()
    {
        return $this->group;
    }

    /**
     * @param mixed $group
     */
    public function setGroup($group)
    {
        $this->group = $group;
    }

    /**
     * @return mixed
     */
    public function getConnexions()
    {
        return json_decode($this->connexions,true);
    }

    /**
     * @param mixed $connexions
     */
    public function setConnexions($connexions)
    {
        $this->connexions = json_encode($connexions);
    }

    /**
     * @return mixed
     */
    public function getAppsUsagePeriod()
    {
        return json_decode($this->appsUsage,true);
    }

    /**
     * @param mixed $appsUsage
     */
    public function setAppsUsagePeriod($appsUsage)
    {
        $this->appsUsage = json_encode($appsUsage);
    }

    /**
     * @return mixed
     */
    public function getPeriodStartedAt()
    {
        return $this->periodStartedAt;
    }

    /**
     * @param mixed $periodStartedAt
     */
    public function setPeriodStartedAt($periodStartedAt)
    {
        $this->periodStartedAt = $periodStartedAt;
    }

    /**
     * @return mixed
     */
    public function getPeriodEndedAt()
    {
        return $this->periodEndedAt;
    }

    /**
     * @param mixed $periodEndedAt
     */
    public function setPeriodEndedAt($periodEndedAt)
    {
        $this->periodEndedAt = $periodEndedAt;
    }

    /**
     * @return mixed
     */
    public function getPeriodExpectedToEndAt()
    {
        return $this->periodExpectedToEndAt;
    }

    /**
     * @param mixed $periodExpectedToEndAt
     */
    public function setPeriodExpectedToEndAt($periodExpectedToEndAt)
    {
        $this->periodExpectedToEndAt = $periodExpectedToEndAt;
    }

    /**
     * @return mixed
     */
    public function getGroupPricingInstance()
    {
        return $this->groupPricingInstance;
    }

    /**
     * @param mixed $groupPricingInstance
     */
    public function setGroupPricingInstance($groupPricingInstance)
    {
        $this->groupPricingInstance = $groupPricingInstance;
        if ($groupPricingInstance != null){
            $this->periodExpectedToEndAt = $groupPricingInstance->getEndAt();
        }
    }

    /**
     * @return mixed
     */
    public function getCurrentCost()
    {
        return $this->currentCost;
    }

    /**
     * @param mixed $currentEstimatedCost
     */
    public function setCurrentCost($currentEstimatedCost)
    {
        $this->currentCost = $currentEstimatedCost;
    }

    /**
     * @return mixed
     */
    public function getExpectedCost()
    {
        return $this->expectedCost;
    }

    /**
     * @param mixed $expectedCost
     */
    public function setExpectedCost($expectedCost)
    {
        $this->expectedCost = $expectedCost;
    }
    /**
     * @return mixed
     */
    public function getEstimatedCost()
    {
        return $this->estimatedCost;
    }

    /**
     * @param mixed $EstimatedCost
     */
    public function setEstimatedCost($EstimatedCost)
    {
        $this->estimatedCost = $EstimatedCost;
    }
    /**
     * @return int
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * @param int $id
     */
    public function setId($id)
    {
        $this->id = $id;
    }




}

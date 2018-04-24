<?php

namespace WebsiteApi\WorkspacesBundle\Entity;

use Doctrine\ORM\Mapping as ORM;




/**
 * Group
 *
 * @ORM\Table(name="pricing_plan",options={"engine":"MyISAM"})
 * @ORM\Entity(repositoryClass="WebsiteApi\WorkspacesBundle\Repository\PricingPlanRepository")
 */
class PricingPlan
{
	/**
	 * @var int
	 *
	 * @ORM\Column(name="id", type="integer")
	 * @ORM\Id
	 * @ORM\GeneratedValue(strategy="AUTO")
	 */
	protected $id;

	/**
	 * @ORM\Column(name="name", type="string", length=255)
	 */
	protected $label = "";

	/**
	 * @ORM\Column(name="month_price", type="float")
	 */
	protected $month_price = 0;

	/**
	 * @ORM\Column(name="year_price", type="float")
	 */
	protected $year_price = 0;

	/**
	 * @ORM\OneToMany(targetEntity="WebsiteApi\WorkspacesBundle\Entity\Group", mappedBy="pricingPlan")
	 */
	private $groups;

    /**
     * @ORM\Column(type="text")
     */
    protected $limitation;


	public function __construct($name) {
		$this->label = $name;
		$this->limitation = json_encode([
            "apps"=>10,
            "drive"=>0,
            "maxWorkspace"=>10,
            "maxUSer"=>10
        ]);
	}

	public function getId(){
		return $this->id;
	}

	/**
	 * @return mixed
	 */
	public function getLabel()
	{
		return $this->label;
	}

	/**
	 * @return mixed
	 */
	public function getMonthPrice()
	{
		return $this->month_price;
	}

	/**
	 * @param mixed $month_price
	 */
	public function setMonthPrice($month_price)
	{
		$this->month_price = $month_price;
	}

	/**
	 * @return mixed
	 */
	public function getYearPrice()
	{
		return $this->year_price;
	}

	/**
	 * @param mixed $year_price
	 */
	public function setYearPrice($year_price)
	{
		$this->year_price = $year_price;
	}

	/**
	 * @param mixed $label
	 */
	public function setLabel($label)
	{
		$this->label = $label;
	}

	/**
	 * @return mixed
	 */
	public function getGroups()
	{
		return $this->groups;
	}

    public function setLimitation($limit)
    {
        $this->limitation = json_encode($limit);
    }

    public function getLimitation()
    {
        if($this->limitation == null){
            return [];
        }
        return json_decode($this->limitation, 1);
    }

    public function getAsArray(){
        return Array(
            "id"=> $this->getId(),
            "label" => $this->getLabel(),
            "month_price" => $this->getMonthPrice(),
            "year_price" => $this->getYearPrice(),
            "groups" => $this->getGroups(),
            "limitation" => $this->getLimitation()
        );
    }

}

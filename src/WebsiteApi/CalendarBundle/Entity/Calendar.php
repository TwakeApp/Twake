<?php

namespace WebsiteApi\CalendarBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Event
 *
 * @ORM\Table(name="calendar",options={"engine":"MyISAM"})
 * @ORM\Entity(repositoryClass="WebsiteApi\CalendarBundle\Repository\CalendarRepository")
 */

class Calendar {

    /**
     * @var int
     *
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;

    /**
     * @ORM\Column(name="title", type="string", nullable=true)
     */
    private $title;

    /**
     * @ORM\Column(name="color", type="string", nullable=true)
     */
    private $color;

    /**
     * @ORM\Column(name="workspaces_number", type="integer", nullable=true)
     */
    private $workspacesNumber = 1;

    /**
     * @ORM\Column(name="autoShareList", type="string", length=264, nullable=true)
     */
    private $autoParticipantList;


    public  function __construct($title,$color)
    {
        $this->setTitle($title);
        $this->setColor($color);
        $this->autoParticipantList = null;
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
    public function getAutoParticipantList()
    {
      return json_decode($this->autoParticipantList, true );
       // return $this->autoParticipantList;
    }

    /**
     * @param mixed $autoParticipantList
     */
    public function setAutoParticipantList($autoParticipantList)
    {
        $this->autoParticipantList = json_encode($autoParticipantList);
       // $this->autoParticipantList = $autoParticipantList;
    }

    /**
     * @param int $id
     */
    public function setId($id)
    {
        $this->id = $id;
    }

    /**
     * @return mixed
     */
    public function getTitle()
    {
        return $this->title;
    }

    /**
     * @param mixed $title
     */
    public function setTitle($title)
    {
        $this->title = $title;
    }

    /**
     * @return mixed
     */
    public function getColor()
    {
        return $this->color;
    }

    /**
     * @param mixed $color
     */
    public function setColor($color)
    {
        $this->color = $color;
    }

    /**
     * @return mixed
     */
    public function getWorkspacesNumber()
    {
        return $this->workspacesNumber;
    }

    /**
     * @param mixed $workspacesNumber
     */
    public function setWorkspacesNumber($workspacesNumber)
    {
        $this->workspacesNumber = $workspacesNumber;
    }

    public function getAsArray(){
        return Array(
            "id" => $this->getId(),
            "name" => $this->getTitle(),
            "color" => $this->getColor(),
            "workspaces_number" => $this->getWorkspacesNumber(),
            "autoParticipate" => $this->getAutoParticipantList()
        );
    }


}
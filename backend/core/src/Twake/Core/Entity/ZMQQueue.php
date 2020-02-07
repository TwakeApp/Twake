<?php

namespace Twake\Core\Entity;

use Doctrine\ORM\Mapping as ORM;

use Symfony\Component\Validator\Constraints\DateTime;

/**
 * ZMQQueue
 *
 * @ORM\Table(name="zmq_queue",options={"engine":"MyISAM"})
 * @ORM\Entity()
 */
class ZMQQueue
{

    /**
     * @ORM\Column(name="id", type="twake_timeuuid")
     * @ORM\Id
     */
    private $id;

    /**
     * @ORM\Column(name="route", type="string", length=2014)
     */
    private $route;

    /**
     * @ORM\Column(name="data", type="string", length=2014)
     */
    private $data;

    /**
     * Sessions constructor.
     * @param $sess_id
     */
    public function __construct($route, $data)
    {
        $this->route = $route;
        $this->data = $data;
    }

    /**
     * @return mixed
     */
    public function getRoute()
    {
        return $this->route;
    }

    /**
     * @return mixed
     */
    public function getData()
    {
        return $this->data;
    }


}

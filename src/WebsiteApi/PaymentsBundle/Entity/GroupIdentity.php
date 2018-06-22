<?php
/**
 * Created by PhpStorm.
 * User: ehlnofey
 * Date: 13/06/18
 * Time: 14:15
 */

namespace WebsiteApi\PaymentsBundle\Entity;


use Doctrine\Common\Persistence\ObjectManager;
use Doctrine\ORM\Mapping as ORM;
use WebsiteApi\WorkspacesBundle\Entity\Workspace;
use WebsiteApi\UsersBundle\Entity\User;

/**
 * GroupIdentity
 *
 * @ORM\Table(name="group_identity",options={"engine":"MyISAM"})
 * @ORM\Entity(repositoryClass="WebsiteApi\PaymentsBundle\Repository\GroupIdentityRepository")
 */
class GroupIdentity
{
    /**
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;
    /**
     * @ORM\ManyToOne(targetEntity="WebsiteApi\WorkspacesBundle\Entity\Group")
     */
    private $group;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $billingAddress;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $address;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $mail;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $phoneNumber;

    /**
     * @ORM\Column(type="datetime", nullable=true)
     */
    private $lockDate;


    public function __construct($group, $billingAddress, $address, $mail, $phoneNumber)
    {
        $this->group = $group;
        $this->billingAddress = $billingAddress;
        $this->address = $address;
        $this->mail = $mail;
        $this->phoneNumber = $phoneNumber;
    }

    /**
     * @param mixed $lockDate
     */
    public function setLockDate($lockDate)
    {
        $this->lockDate = $lockDate;
    }

    /**
     * @return mixed
     */
    public function getLockDate()
    {
        return $this->lockDate;
    }

    /**
     * @return mixed
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * @return mixed
     */
    public function getGroup()
    {
        return $this->group;
    }

    /**
     * @return mixed
     */
    public function getBillingAddress()
    {
        return $this->billingAddress;
    }

    /**
     * @return mixed
     */
    public function getAddress()
    {
        return $this->address;
    }

    /**
     * @return mixed
     */
    public function getMail()
    {
        return $this->mail;
    }

    /**
     * @return mixed
     */
    public function getPhoneNumber()
    {
        return $this->phoneNumber;
    }



    public function getAsArray() {

        $group_identity =  Array(
            "id" => $this->getId(),
            "billing_address" => $this->getBillingAddress(),
            "address" => $this->getAddress(),
            "mail" => $this->getMail(),
            "phone_number" => $this->getPhoneNumber(),
            "lock_date" => $this-> getLockDate()
        );

        $group = $this->getGroup()->getAsArray();

        return array_merge($group_identity,$group);
    }

}
<?php
/**
 * Created by PhpStorm.
 * User: founski
 * Date: 15/01/18
 * Time: 10:34
 */

namespace Administration\AuthenticationBundle\Model;


interface AdministrationStatisticsInterface
{
    //numberOfUserCurrentlyConnected count the number of user currently connected
    public function numberOfUserCurrentlyConnected();

    //numberOfUsers count the number of twake user
    public function numberOfUsers();
}
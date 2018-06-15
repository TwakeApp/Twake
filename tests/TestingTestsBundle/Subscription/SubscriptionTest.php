<?php
/**
 * Created by PhpStorm.
 * User: laura
 * Date: 14/06/18
 * Time: 09:32
 */

namespace Tests\TestingTestsBundle\Subscription;


use Tests\WebTestCaseExtended;

class SubscriptionTest extends WebTestCaseExtended
{


    public function testIndex(){

        //détruire les données avant de refaire les tests

        //init de datas qui peuvent être utiles

        $user = $this->newUserByName("phpunit");
        $this->getDoctrine()->persist($user);
        $this->getDoctrine()->flush();

        $group = $this->newGroup($user->getId());
        $this->getDoctrine()->persist($group);
        $this->getDoctrine()->flush();

        $work = $this->newWorkspace($group->getId());
        $this->getDoctrine()->persist($work);
        $this->getDoctrine()->flush();

        $pricing_plan = new \WebsiteApi\WorkspacesBundle\Entity\Pricingplan("testPHP");
        $pricing_plan->setMonthPrice(100);
        $pricing_plan->setYearPrice( 1200);
        $this->getDoctrine()->persist($pricing_plan);

        try{

            $subscription = $this->newSubscription($group,$pricing_plan, $pricing_plan->getMonthPrice(), new \DateTime('now'), (new \DateTime('now'))->add(new \DateInterval("P1M")), false, false);
            $this->getDoctrine()->persist($subscription);
            $this->getDoctrine()->flush();

        }catch(\Exception $e){
            \Monolog\Handler\error_log("Pb avec l'init de subscription, error log : ".$e->getTraceAsString());
        }


        // methods Subscription
        $log = "";
        $log .=$this->assertInit($subscription, $pricing_plan);
        $log .= $this->assertConsoUsuelle($subscription);
        $log .= $this->assertConsoDepasse($subscription);
        $log .= $this->assertRenewUp($subscription);
        $log .= $this->assertRenewDown($subscription);
        //$log .= $this->casBatard();

        \Monolog\Handler\error_log($log);
    }

    //app.subscription_manager
    /**
     * Scénario : un utilisateur est créé, il a un group qui correspond, il possède un premier abonnement qui est créé
     *  Vérifcation des données de base
     */
    public function assertInit($sub, $pricing_plan){
        $result = ($this->get("app.subscription_system")->get($sub->getGroup()->getId()));
        $this->assertTrue($result!=null, "Result ne doit pas être null, Id non présent dans la table");

        $arraySub = $result->getAsArray();

        $this->assertTrue($pricing_plan->getId() == $arraySub["pricingPlan"]["id"], " Pricing plan doivent être les mêmes");
        $this->assertTrue($sub->getId() == $arraySub["id"], "Les id doivent être les mêmes ");
        $this->assertTrue($sub->getGroup()->getId() == $arraySub["group"]["id"], " Les groupees doivent être les memes" );
        $this->assertTrue($sub->getBalance() == $arraySub["balance"], "Les balances doivent être les memes ");
        $this->assertTrue($sub->getBalanceConsumed() == $arraySub["balanceConsumed"], "Les balances de consommation doivent être les memes");
        $this->assertTrue($arraySub["autoRenew"] == false, " Doit être à faux");
        $this->assertTrue($arraySub["autoWithdrawable"] == false,"DOit être à faux");


        //faire un rapport de log

    }


    /**
     * Consommation usuelle d'un abonnement
     */
    public function assertConsoUsuelle($sub){

        $test1= $this->get("app.subscription_system")->get($sub->getGroup());
        $this->assertTrue($test1 != null, " ne doit pas être faux, id non présent dans la db");
        $test2= $this->get("app.subscription_system")->addBalanceConsumption($sub->getGroup(), 100);
       //test de bonne réponse de tout s'est ben passé ( pas encore implémenté )
        $this->getDoctrine()->persist($sub);
        $this->getDoctrine()->flush();
        $test3= $this->get("app.subscription_system")->get($sub->getGroup()->getId());

        $this->assertTrue(($test1 != $test3) && ($test1 == 0) && ($test3 == 100));

        //TODO avec les nouvelles méthodes
        $this->assertTrue(!($this->get("app.subscription_system")->groupIsOverUsingALittle($sub->getGroup()->getId())), "Doit être false");
        $this->assertTrue(!($this->get("app.subscription_system")->groupIsOverUsingALot($sub->getGroup()->getId())), "Doit être false");
        $this->assertTrue(!($this->get("app.subscription_system")->groupWillBeOVerUsing($sub->getGroup()->getId())), "Doit être false");
        $this->assertTrue(!($this->get("app.subscription_system")->getOverCost($sub->getGroup()->getId())), "Doit être false");
    }

    /**
     * consommation d'un abonnement mais qui dépasse
     */
    public function assertConsoDepasse($sub){

        $test1= $this->get("app.subscription_system")->get($sub->getGroup());
        $test2= $this->get("app.subscription_system")->addBalanceConsumption($sub->getGroup(), 500);
        $this->getDoctrine()->persist($sub);
        $this->getDoctrine()->flush();
        $test3= $this->get("app.subscription_system")->get($sub->getGroup());

        //un petit peu
        $this->assertTrue(($test1 != $test3) && ($test1 == 100) && ($test3 == 600));

        $this->assertTrue(($this->get("app.subscription_system")->groupIsOverUsingALittle($sub->getGroup()->getId())), "Doit être true");
        $this->assertTrue(!($this->get("app.subscription_system")->groupIsOverUsingALot($sub->getGroup()->getId())), "Doit être false");
        $this->assertTrue(($this->get("app.subscription_system")->groupWillBeOVerUsing($sub->getGroup()->getId())), "Doit être true");
        $this->assertTrue(($this->get("app.subscription_system")->getOverCost($sub->getGroup()->getId())), "Doit être true");

        //beaucoup
        $test1= $this->get("app.subscription_system")->get($sub->getGroup());
        $test2= $this->get("app.subscription_system")->addBalanceConsumption($sub->getGroup()->getId(), 3000);
        $this->getDoctrine()->persist($sub);
        $this->getDoctrine()->flush();
        $test3= $this->get("app.subscription_system")->get($sub->getGroup());

        $this->assertTrue(($test1 != $test3) && ($test1 == 600) && ($test3 == 3600));


        $this->assertTrue(!($this->get("app.subscription_system")->groupIsOverUsingALittle($sub->getGroup()->getId())), "Doit être false");
        $this->assertTrue(($this->get("app.subscription_system")->groupIsOverUsingALot($sub->getGroup()->getId())), "Doit être true");
        $this->assertTrue(($this->get("app.subscription_system")->groupWillBeOVerUsing($sub->getGroup()->getId())), "Doit être true");
        $this->assertTrue(($this->get("app.subscription_system")->getOverCost($sub->getGroup()->getId())), "Doit être true");

        //faire le lock aussi ensuite
        $this->assertTrue($this->get("app.subscription_system")->updateLockdate($sub->getGroup()->getId()), " ne doit pas retourner false");
    }

    /**
     * renouvellement d'un abonnement ( archivage de l'ancien et nouveau abo )
     */
    public function assertRenewUp($sub){

        $pricing_plan_cher = new \WebsiteApi\WorkspacesBundle\Entity\PricingPlan("testCher");
        $pricing_plan_cher->setMonthPrice(1000);
        $pricing_plan_cher->setYearPrice(12000);
        $this->getDoctrine()->persist($pricing_plan_cher);
        $this->getDoctrine()->flush();

        try{
            $cost = $sub->getBalance()+$this->get("app.subscription_system")->getRemainingBalance($sub->getGroup());
           $bill =  $this->get("app.subscription_manager")->renew($sub->getGroup(),$pricing_plan_cher, $pricing_plan_cher->getMonthPrice(), new \DateTime('now'), (new \DateTime('now'))->add(new \DateInterval("P1M")), false, false,$cost);

        }catch(\Exception $e){
            \Monolog\Handler\error_log("Pb avec renew de subscription, error log : ".$e->getTraceAsString());
        }

        $this->assertTrue($bill != null);
        $result = ($this->get("app.subscription_system")->get($sub->getGroup()));
        $this->assertTrue($result!=null, "Result ne doit pas être null, Id non présent dans la table");

        $arraySub = $result->getAsArray();

        $this->assertTrue($pricing_plan_cher->getId() == $arraySub["pricingPlan"]["id"], " Pricing plan doivent être les mêmes");
        $this->assertTrue($sub->getId() != $arraySub["id"], "Les id ne doivent pas être les mêmes ");
        $this->assertTrue($sub->getGroup()->getId()== $arraySub["group"]["id"], " Les groupees doivent être les memes" );
        $this->assertTrue($arraySub["autoRenew"] == false, " Doit être à faux");
        $this->assertTrue($arraySub["autoWithdrawable"] == false,"DOit être à faux");

    }

    /**
     * renouvellement d'un abonnement revue à la baisse
     */
    public function assertRenewDown($sub){


        $pricing_plan = new \WebsiteApi\WorkspacesBundle\Entity\Pricingplan("testPHPpasCher");
        $pricing_plan->setMonthPrice(10);
        $pricing_plan->setYearPrice( 120);
        $this->getDoctrine()->persist($pricing_plan);

        try{
            $cost = $sub->getBalance()+$this->get("app.subscription_system")->getRemainingBalance($sub->getGroup());
            $bill =  $this->get("app.subscription_manager")->renew($sub->getGroup(),$pricing_plan, $pricing_plan->getMonthPrice(), new \DateTime('now'), (new \DateTime('now'))->add(new \DateInterval("P1M")), false, false,$cost);

        }catch(\Exception $e){
            \Monolog\Handler\error_log("Pb avec renew de subscription, error log : ".$e->getTraceAsString());
        }

        $this->assertTrue($bill != null);
        $result = ($this->get("app.subscription_system")->get($sub->getGroup()->getId()));
        $this->assertTrue($result!=null, "Result ne doit pas être null, Id non présent dans la table");

        $arraySub = $result->getAsArray();

        $this->assertTrue($pricing_plan->getId()== $arraySub["pricingPlan"]["id"], " Pricing plan doivent être les mêmes");
        $this->assertTrue($sub->getId() != $arraySub["id"], "Les id ne doivent pas être les mêmes ");
        $this->assertTrue($sub->getGroup()->getId()== $arraySub["group"]["id"], " Les groupees doivent être les memes" );
        $this->assertTrue($arraySub["autoRenew"] == false, " Doit être à faux");
        $this->assertTrue($arraySub["autoWithdrawable"] == false,"DOit être à faux");

    }

    /**


    public function assertUpdateLockDate(){

    // Verif que la lockdate est mise à jour sur demande ( récupérer groupIdentity )

    $result = ($this->get("service.subscriptionSystem")->get($sub->getId()))->getAsArray();
    assert($result != null, "Result ne doit pas être null, Id non présent ");

    $groupIdentityRepo = $this->doctrine->getRepository("TwakePaymentsBundle:GroupIdentity");
    $identity = $groupIdentityRepo->findOneBy(Array("group"=>$sub->getGroup()->getId()));

    assert($groupIdentityRepo != null && $identity != null);
    $oldLock = $identity->getLockDate();
    $dateLock = (new \DateTime('now'))->add(new \DateInterval("P5D"));
    assert($oldLock == null, "ancienne date doit etre null car non lock par defaut au départ");

    $result = ($this->get("service.subscriptionSystem")->updateLockDate($sub->getGroup->getId()));

    $identity = $groupIdentityRepo->findOneBy(Array("group"=>$sub->getGroup()->getId()));

    assert(($dateLock->getTimestamp() - $identity->getLockDate()) == 0, "doit être egal à 0 " ) ;

    }
     */
}
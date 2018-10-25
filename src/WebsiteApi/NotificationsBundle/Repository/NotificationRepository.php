<?php

namespace WebsiteApi\NotificationsBundle\Repository;

/**
 * VerificationNumberMailRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class NotificationRepository extends \Doctrine\ORM\EntityRepository
{

    public function getMailCandidates($number_of_mails, $lastmail_before_date = null, $minimum_delay_sec = null, $app = null)
    {

        $qb = $this->createQueryBuilder('m')
            ->select('IDENTITY(m.user), count(m)')
            ->where('m.mail_sent = :numbermail')
            ->andWhere('m.isRead = :read')
            ->setParameter("numbermail", $number_of_mails)
            ->setParameter("read", 0);

        if ($lastmail_before_date) {
            $qb = $qb->andWhere('m.last_mail < :lastmail')
                ->setParameter("lastmail", $lastmail_before_date);
        } else {
            $qb = $qb->andWhere('m.last_mail IS NULL');
        }

        if ($minimum_delay_sec) {
            $date = new \DateTime();
            $qb = $qb->andWhere('m.date < :delaydate')
                ->setParameter("delaydate", $date->setTimestamp(date("U") - $minimum_delay_sec));
        }

        if ($app) {
            $qb = $qb->andWhere('m.application = :app')
                ->setParameter("app", $app);
        }

        $qb->groupBy("m.user");

        return $qb->getQuery()->getResult();

    }

    public function updateMailCandidates($number_of_mails, $before_date = null)
    {

        $qb = $this->createQueryBuilder('m');
        $qb = $qb
            ->update()
            ->set('m.mail_sent', $qb->expr()->literal($number_of_mails + 1))
            ->set('m.last_mail', ":last_mail")
            ->setParameter('last_mail', new \DateTime())
            ->where('m.mail_sent = :numbermail')
            ->setParameter("numbermail", $number_of_mails);
        if ($before_date) {
            $qb = $qb->andWhere('m.last_mail < :lastmail')
                ->setParameter("lastmail", $before_date);
        } else {
            $qb = $qb->andWhere('m.last_mail IS NULL');
        }

        return $qb->getQuery()->execute();

    }

    public function getAppNoMessages($app){
        $qb = $this->createQueryBuilder('n');
        $qb->where('n.application != :app');
        $qb->setParameter('app',$app);

        return $qb->getQuery()->getResult();
    }

}

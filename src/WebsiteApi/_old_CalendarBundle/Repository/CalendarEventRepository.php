<?php

namespace WebsiteApi\_old_CalendarBundle\Repository;

/**
 * EventRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class CalendarEventRepository extends \WebsiteApi\CoreBundle\Services\DoctrineAdapter\RepositoryAdapter
{

    public function removeAllByCalendar($calendar)
    {
        $qb = $this->createQueryBuilder('e');
        $qb->delete();
        $qb->where('e.calendar = :calendar');
        $qb->setParameter('calendar', $this->queryBuilderUuid($calendar));
        $q = $qb->getQuery();

        return $q->getResult();
    }

    public function getCalendarsEventsBy($from, $to, $calendarsId)
    {

        $qb = $this->createQueryBuilder('e');
        $qb->where($qb->expr()->gte('e.to', '?1'));
        $qb->andWhere($qb->expr()->lte('e.from', '?2'));
        $qb->andWhere($qb->expr()->in('e.calendar', '?3'));
        $qb->setParameter(1, $from);
        $qb->setParameter(2, $to);
        $qb->setParameter(3, $this->queryBuilderUuid($calendarsId));
        $q = $qb->getQuery();

        return $q->getResult();
    }

    public function toRemind()
    {
        $qb = $this->createQueryBuilder('e');
        $qb->where($qb->expr()->neq('e.nextReminder', '0'));
        $qb->andWhere($qb->expr()->lte('e.nextReminder', date("U")));
        $q = $qb->getQuery();

        return $q->getResult();
    }

    public function getAllCalendarEventsByCalendar($calendarId)
    {
        $qb = $this->createQueryBuilder('e');
        $qb->where($qb->expr()->in('e.calendar', '?1'))
            ->setParameter(1, $this->queryBuilderUuid($calendarId));
        $q = $qb->getQuery();

        return $q->getResult();
    }

}
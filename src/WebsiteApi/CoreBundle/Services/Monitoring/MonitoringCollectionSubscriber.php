<?php

namespace WebsiteApi\CoreBundle\Services\Monitoring;

use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\FilterResponseEvent;
use Symfony\Component\HttpKernel\Event\PostResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use TweedeGolf\PrometheusClient\PrometheusException;

/**
 * Class MonitoringCollectionSubscriber
 *
 * Subscribe on kernel events to collect and save monitoring metrics
 *
 * @package Suez\Bundle\PrometheusMonitoringBundle\EventSubscriber
 */
class MonitoringCollectionSubscriber implements EventSubscriberInterface
{
    /**
     * The registry of data collectors in the API
     *
     * @var CollectorRegistry
     */
    protected $dataRegistry;

    /**
     * MonitoringCollectionSubscriber constructor.
     *
     * @param CollectorRegistry $dataRegistry
     */
    public function __construct(CollectorRegistry $dataRegistry)
    {
        $this->dataRegistry = $dataRegistry;

        $dataRegistry->init();
    }

    /**
     * Handles the onKernelResponse event.
     *
     * Collect the metrics on this event
     *
     * @param $event FilterResponseEvent
     */
    public function onKernelResponse(FilterResponseEvent $event)
    {
        $master = $event->isMasterRequest();
        if (!$master) {
            return;
        }

        $request = $event->getRequest();

        $route = $request->get('_route');

        if ($route != "tweede_golf_prometheus_metrics") {

            $this->dataRegistry->setCurrentRoute($route);
            $this->dataRegistry->collect($request, $event->getResponse());

        }
    }

    /**
     * Handles the onKernelTerminate event.
     *
     * Save the collected metrics to the backend
     *
     * @param PostResponseEvent $event
     */
    public function onKernelTerminate(PostResponseEvent $event)
    {
        try {
            $this->dataRegistry->save();
        } catch (PrometheusException $e) {
            error_log('Save prometheus metrics error');
            error_log((string)$e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public static function getSubscribedEvents()
    {
        return array(
            KernelEvents::RESPONSE => array('onKernelResponse', -100),
            KernelEvents::TERMINATE => array('onKernelTerminate', -1024),
        );
    }
}

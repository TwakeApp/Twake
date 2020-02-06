<?php

namespace Twake\Core;

require_once __DIR__ . "/Resources/Routing.php";
require_once __DIR__ . "/Resources/Services.php";

require_once __DIR__ . "/Entity/FrontObject.php";
require_once __DIR__ . "/Entity/SearchableObject.php";

use Twake\Core\Resources\Routing;
use Twake\Core\Resources\Services;
use Common\BaseBundle;

class Bundle extends BaseBundle
{

    protected $bundle_root = __DIR__;
    protected $bundle_namespace = __NAMESPACE__;
    protected $routes = [];
    protected $services = [];

    public function initRoutes()
    {
        $routing = new Routing();
        $this->routes = $routing->getRoutes();
        $this->routing_prefix = $routing->getRoutesPrefix();
        parent::initRoutes();

        $this->services = (new Services())->getServices();
        parent::initServices();
    }
}
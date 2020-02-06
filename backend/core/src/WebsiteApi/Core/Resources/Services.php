<?php

namespace WebsiteApi\Core\Resources;

use Common\BaseServices;

class Services extends BaseServices
{

    protected $services = [
        "app.websockets" => "Websockets",
        "app.twake_mailer" => "TwakeMailer",
        "twake.restclient" => "TwakeRestClient",
        "app.pusher" => "ZMQPusher",
        "app.translate" => "Translate",
        "app.twake_doctrine" => "DoctrineAdapter/ManagerAdapter",
        "app.websockets" => "Websockets",
        "app.accessmanager" => "AccessManager",
        "app.exportversion" => "ExportManager",
    ];

}
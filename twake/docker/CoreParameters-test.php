<?php

namespace Configuration;

class Parameters extends \Common\Configuration
{

    public $configuration = [];

    public function __construct()
    {
        $this->configuration = [
            "admin_api_token" => "",
            "MAIL_FROM" => "",
            "SERVER_NAME" => "",
            "LICENCE_KEY" => "",
            "STANDALONE" => true,
            "ELASTIC_SERVER" => "",
            "DRIVE_SALT" => "SecretPassword",
            "server_name" => "http://localhost:8080/",
            "drive_previews_tmp_folder" => "/tmp/",
            "drive_tmp_folder" => "/tmp/",
            "secret" => "somesecret",
            "mail" => [
                "sender" => [
                    "host" => "",
                    "port" => "25",
                    "username" => "",
                    "password" => "",
                    "auth_mode" => "plain"
                ],
                "template_dir" => "/src/Twake/Core/Resources/views/",
                "twake_domain_url" => "https://twakeapp.com/",
                "from" => "noreply@twakeapp.com",
                "from_name" => "Twake",
                "twake_address" => "Twake, 54000 Nancy, France",
                "dkim" => [
                    "private_key" => "",
                    "domain_name" => '',
                    "selector" => ''
                ]
            ],
            "websocket" => [
                "host" => "websockets",
                "port" => "8080"
            ],
            "db" => [
                "driver" => "pdo_cassandra",
                "host" => "scylladb",
                "port" => 9042,
                "dbname" => "twake",
                "user" => "root",
                "password" => "root",
                "encryption_key" => "c9a17eab88ab63bb3e90c027196a89776651a7c06651a7c0",
                "dev" => true
            ],
            "openstack" => [
                "use" => false,
                "project_id" => "",
                "auth_url" => "https//auth.cloud.ovh.net/v2.0",
                "buckets_prefix" => "",
                "buckets" => [
                    "fr" => [
                        "public" => "",
                        "private" => "",
                        "region" => "SBG5"
                    ],
                    "user" => [
                        "id" => "",
                        "password" => ""
                    ]
                ],
            ],
            "aws" => [
                "S3" => [
                    "base_url" => "http//127.0.0.1:9000",
                    "use" => false,
                    "version" => "latest",
                    "buckets_prefix" => "dev.",
                    "buckets" => [
                        "fr" => "eu-west-3"
                    ],
                    "credentials" => [
                        "key" => "",
                        "secret" => " "
                    ]
                ],
            ],
            "local" => [
                "storage" => [
                    "use" => false,
                    "location" => "../drive/",
                    "preview_location" => "../web/medias/",
                    "preview_public_path" => "/medias/"
                ]
            ]
        ];
    }

}

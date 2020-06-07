<?php

namespace BuiltInConnectors\Common\Command;

use Common\Commands\ContainerAwareCommand;

class InitConnector extends ContainerAwareCommand
{

    protected function configure()
    {
        $this->setName("twake:init_connector");
    }

    protected function execute()
    {

      $connector_name = isset(func_get_args()[0]) ? func_get_args()[0] : false;
      if(!$connector_name){
        error_log("Choose which connector to enable.\n php bin/console twake:init_connector jitsi enable forced\n php bin/console twake:init_connector jitsi disable");
        die;
      }
      $action_name = isset(func_get_args()[1]) ? func_get_args()[1] : "enable";
      $enable = $action_name != "disable";

      $second_action_name = isset(func_get_args()[2]) ? func_get_args()[2] : "";
      $force = $second_action_name == "forced";

      error_log(($enable?"Enabling" : "Disabling") . " " . $connector_name. ($force?" and forcing in future workspaces":"") . "!");

      $path = __DIR__ . "/../../Connectors/";
      $dir = new \DirectoryIterator($path);
      $connectors_bundles_instances = [];
      // Require and instanciate all defined connectors
      foreach ($dir as $fileinfo) {
          if ($fileinfo->isDir() && !$fileinfo->isDot()) {
            try{
              $bundle = "BuiltInConnectors/Connectors/" . $fileinfo->getFilename();
              if (file_exists(__DIR__ . "/../../../" . $bundle . "/Bundle.php")) {
                  $class_name = str_replace("/", "\\", $bundle) . "\\Bundle";
                  $connectors_bundles_instances[] = new $class_name($this->app);
              } else {
                  error_log("No such connector bundle " . $bundle);
              }
            }catch(\Exception $err){
              error_log("No such connector bundle " . $fileinfo->getFilename());
              error_log($err->getMessage());
            }
          }
      }

      $found = false;
      // Init routing for all bundles
      foreach ($connectors_bundles_instances as $bundle_instance) {
        if(method_exists($bundle_instance, "getDefinition")){
          $definition = $bundle_instance->getDefinition();
          error_log(json_encode($definition));

          if($definition["simple_name"] == $connector_name){
              $found = true;

              $simple_name = "twake.".$definition["simple_name"];

              $app_exists = $this->app->get("app.applications")->findAppBySimpleName($simple_name, true);

              $application = [
                'simple_name' => $simple_name,
                'name' => $definition['name'],
                'description' => $definition['description'],
                'icon_url' => $definition['icon_url'],
                'website' => $definition['website'],
                'categories' => $definition['categories'],

                'privileges' => $definition['privileges'],
                'capabilities' => $definition['capabilities'],
                'hooks' => $definition['hooks'],
                'display' => $definition['display'],
                'api_allowed_ips' => $definition['api_allowed_ips'],
                'api_event_url' => rtrim($this->app->getParameter("SERVER_NAME"), "/") . "/bundle/connectors/" . $definition["simple_name"] . ltrim($definition['api_event_url'], "/"),
                'public': true
              ];

              if($enable){
                //Update database with this app
                if(!$app_exists){
                  $new_app = $this->app->get("app.applications")->createApp(null, $definition["name"], $simple_name, $definition["app_group_name"], null);
                  $application["id"] = $new_app["id"];
                }

                $this->app->get("app.applications")->update($application, true);

                error_log("The connector is now available to the public.");
              }else{
                //If in database, set to non public

                if($app_exists){
                    $application["public"] = false;
                    $application["id"] = $app_exists["id"];
                    $this->app->get("app.applications")->update($application, true);
                }

                error_log("The connector is now unavailable to the public.");
              }

          }

        }
      }

      if(!$found){
        error_log("This connector was not found.");
      }
    }

}

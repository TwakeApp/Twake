<?php


namespace WebsiteApi\DriveBundle\Services;


use WebsiteApi\DriveBundle\Entity\DriveFile;

class DriveSystem
{

    function __construct($entity_manager, $drive_file_system_selector, $uploader)
    {
        $this->em = $entity_manager;
        $this->dfs = $drive_file_system_selector->getFileSystem();
        $this->uploader = $uploader;
    }

    /** Called from Collections manager to verify user has access to websockets room, registered in CoreBundle/Services/Websockets.php */
    public function init($route, $data, $current_user = null)
    {
        //TODO
        return true;
    }

    public function hasAccess($data, $current_user = null, $drive_element = null)
    {
        return true;
    }

    public function get($options, $current_user)
    {
        $directory_id = $options["directory_id"];
        $workspace_id = $options["workspace_id"];
        $trash = $options["trash"];

        if (!$directory_id) {
            $directory_id = "root";
        }

        if (!$this->hasAccess($options, $current_user)) {
            return false;
        }

        $elements = $this->dfs->listDirectory($workspace_id, $directory_id, $trash);
        $path = $this->dfs->getPath($workspace_id, $directory_id);

        $list = Array();
        foreach ($elements as $element) {
            $array = $element->getAsArray();
            $array["path"] = $path;
            $list[] = $array;
        }

        return $list;

    }

    public function find($options, $current_user)
    {
        $element_id = $options["element_id"];
        $workspace_id = $options["workspace_id"];

        if (!$element_id) {
            $element_id = "root";
        }

        if (!$this->hasAccess($options, $current_user)) {
            return false;
        }

        $data = $this->dfs->getInfos($workspace_id, $element_id);

        if (!$data) {
            return null;
        }

        $path = $this->dfs->getPath($workspace_id, $element_id);

        $data = $data->getAsArray();
        $data["path"] = $path;

        return $data;

    }

    public function remove($object, $options, $current_user)
    {

    }

    public function save($object, $options, $user = null, $application = null, $file_uploaded = null)
    {

        if (!$object["workspace_id"]) {
            $object["workspace_id"] = "";
        }

        if (!$object["parent_id"]) {
            $object["parent_id"] = "";
        } else {
            //TODO check parent correspond to a folder of workspace_id
        }

        if ($file_uploaded) {
            $drive_element = $this->dfs->upload($object, $file_uploaded, $this->uploader, $user, $application);
        } else {
            $drive_element = $this->dfs->save($object, $user, $application);
        }

        if (!$drive_element) {
            return false;
        }

        return $drive_element->getAsArray();

    }

}

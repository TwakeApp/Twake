<?php


namespace WebsiteApi\DriveBundle\Services;


use WebsiteApi\DriveBundle\Entity\DriveFile;

class DriveFileRefacto
{

    function __construct($entity_manager, $drive_file_system_selector, $uploader, $application_api)
    {
        $this->em = $entity_manager;
        $this->dfs = $drive_file_system_selector->getFileSystem();
        $this->uploader = $uploader;
        $this->applications_api = $application_api;
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
        var_dump($list);
        return $list;

    }

    public function remove($object, $options, $current_user)
    {

    }

    public function save($object, $options, $current_user = null)
    {

        if (!$this->hasAccess($options, $current_user)) {
            return false;
        }

        $intrash = $object["intrash"];
        //creation d'un fichier de test

//        $fileordirectory = new DriveFile("14005200-48b1-11e9-a0b4-0242ac120005","d1955c66-67f1-11e9-9bbd-0242ac130005");
//        $fileordirectory->setName("File for refacto");
//        $fileordirectory->setSize(150000);
//        $this->em->persist($fileordirectory);
//        $this->em->flush();

//        $fileordirectory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findOneBy(Array("workspace_id" => "14005200-48b1-11e9-a0b4-0242ac120005", "parent_id"=> "d1955c66-67f1-11e9-9bbd-0242ac130005"));
//        if ($fileordirectory->getName() == "File for refacto") {
//            $fileordirectory->setParentId("8287d84a-5b64-11e9-a7a4-0242ac120005");
//            $this->em->persist($fileordirectory);
//            $this->em->flush();
//        }

        //var_dump("racine \n");
        $racine = $this->getRootEntity("14005200-48b1-11e9-a0b4-0242ac120005");
        //var_dump($racine->getAsArray()["id"]);

//        $fileordirectory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findOneBy(Array("id"=> "8287d84a-5b64-11e9-a7a4-0242ac120005"));
//        if ($fileordirectory->getName() == "Connecteurs") {
//            $fileordirectory->setSize(150000);
//            $this->em->persist($fileordirectory);
//            $this->em->flush();
//        }

        if(isset($object["id"])) { // on recoit un identifiant donc c'est un modification
            $fileordirectory = $this->em->getRepository("TwakeDriveBundle:DriveFile")
                ->findOneBy(Array("id" => $object["id"]));
            var_dump("id found");
            //var_dump($fileordirectory->getAsArray());
            $fileordirectory_parent_id = $fileordirectory->getParentId();
            if(isset($object["parent_id"])){
                $parent_id = $object["parent_id"];
                if($fileordirectory_parent_id != $parent_id) { //changement de parent id donc le fichier a été déplacé.
                    var_dump("diffrent parent id ");
                    $fileordirectory->setOldParent($fileordirectory_parent_id);
                    $fileordirectory->setParentId($parent_id);
                    $size = $fileordirectory->getSize();
                    //on doit modifer la taille recursivement de l'ancien dossier parent
                    if($fileordirectory->getDetachedFile() == false){
                        var_dump("change size not detached ");
                        $this->updateSize($fileordirectory_parent_id,-$size);
                        //et de la même façon la taille du dossier d'accueil et de ses parents.
                    }
                    else{
                        var_dump("add workspace and change detached ");
                        $fileordirectory->setDetachedFile(false);
                        $workspace_id = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findOneBy(Array("id"=> $parent_id));
                        $workspace_id = $workspace_id->getWorkspaceId();
                        $fileordirectory->setWorkspaceId($workspace_id);
                    }
                    $this->updateSize($parent_id,$size);

                    var_dump("save");
                    $this->em->remove($fileordirectory);
                    $this->em->flush();
                    var_dump("fin save");
                }
            }
        }
        else{ // pas d'identifiant on veut donc créer un fichier
            if(isset($object["front_id"]) && isset($object["workspace_id"])) {
                $front_id = $object["front_id"];
                $workspace_id = $object["workspace_id"];
                if (!isset($object["detached"])) {
                    if (isset($object["parent_id"])) {
                        $parent_id = $object["parent_id"]; // on cree au bon endroit
                    } else {
                        $parent_id = "root"; // on cree a la racine
                    }
                    var_dump("creation fichier");
                    var_dump($workspace_id);
                    var_dump($parent_id);
                    $fileordirectory = new DriveFile($workspace_id, $parent_id);
                    $fileordirectory->setFrontId($front_id);
                    $fileordirectory->setSize(100000);
                    $fileordirectory->setName("Create file");
                    $this->updateSize($parent_id,$fileordirectory->getSize());
                }
                if (isset($object["detached"])) {
                    $fileordirectory = new DriveFile($workspace_id,"");
                    $fileordirectory->setFrontId($front_id);
                    $fileordirectory->setSize(600000);
                    $fileordirectory->setName("Detached file for test");
                    $fileordirectory->setDetachedFile(true);
                    var_dump("fin creation detached");
                }
            }
        }

        if(isset($object["name"])){
            $fileordirectory->setName($object["name"]);
        }
        if(isset($fileordirectory)){
            $this->em->persist($fileordirectory);
            $this->em->flush();
            var_dump($fileordirectory->getAsArray());
        }

        //var_dump($fileordirectory->getAsArray());

        //rajouter l 'utilsateur courant dans le fichier.
        //$fileordirectory->setUser($current_user);

//        // on sauvegarde l'objets et/ou les modifications en base


//        //on renvoie l'objet nouvellement crée

//        $fileordirectory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findOneBy(Array("id" => "ba91c384-8e79-11e9-829a-0242ac130005"));
//        var_dump($fileordirectory->getAsArray()["name"]);
//        var_dump($fileordirectory->getAsArray()["id"]."");
//        var_dump($fileordirectory->getAsArray()["parent_id"]);
//        var_dump($fileordirectory->getAsArray()["size"]);
//        var_dump($fileordirectory->getAsArray()["detached"]);

        $fileordirectory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findBy(Array("id" => "fa983aba-8e8a-11e9-9989-0242ac130005"));
        foreach ($fileordirectory as $file) {
            var_dump($file->getAsArray()["name"]);
            var_dump($file->getAsArray()["id"]);
            var_dump($file->getAsArray()["parent_id"]);
            var_dump($file->getAsArray()["size"]);
            var_dump($file->getAsArray()["detached"]);
//                    $file->setSize(0);
//                    $this->em->persist($file);
//                    $this->em->flush();

        }

        $fileordirectory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findBy(Array("workspace_id" => "14005200-48b1-11e9-a0b4-0242ac120005", "parent_id" => "8287d84a-5b64-11e9-a7a4-0242ac120005"));
        foreach ($fileordirectory as $file) {
                var_dump($file->getAsArray()["name"]);
                var_dump($file->getAsArray()["id"]);
                var_dump($file->getAsArray()["parent_id"]);
                var_dump($file->getAsArray()["size"]);
                var_dump($file->getAsArray()["detached"]);
//                    $file->setSize(0);
//                    $this->em->persist($file);
//                    $this->em->flush();

            }

        $fileordirectory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findBy(Array("workspace_id" => "14005200-48b1-11e9-a0b4-0242ac120005", "parent_id" => "31a5658a-4cbb-11e9-8538-0242ac120005"));
        foreach ($fileordirectory as $file) {
            if ($file->getName() != "") {
                var_dump($file->getAsArray()["name"]);
                var_dump($file->getAsArray()["id"]);
                var_dump($file->getAsArray()["parent_id"]);
                var_dump($file->getAsArray()["size"]);
                var_dump($file->getAsArray()["detached"]);
//                    $file->setSize(0);
//                    $this->em->persist($file);
//                    $this->em->flush();

            }
        }

        return "hello";
    }

    protected function updateSize($directory, $delta) // on passe l'id du directory
    {
        while ($directory != null) {

            if ($directory == "root") {
                $directory = $this->getRootEntity();
            }

            if(is_string($directory)){
                //error_log("search scylla");
                $directory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findOneBy(Array("id" => $directory));

            }
            if (!$directory ){//|| is_string($directory)) {
                $directory = null;

            }

            if($directory != null){
                //error_log(print_r("directory type: " . gettype($directory),true));
                //error_log(print_r("id ".$directory->getId(),true));
                //error_log(print_r($directory->getAsArray(),true));
                //error_log(print_r("delta: ".$delta,true));
                $currentSize = $directory->getSize();
                //error_log(print_r("currentsize: ".$currentSize,true));
                $actualsize = $directory->getSize();
                $directory->setSize($currentSize + $delta);
                //$directory->setSize(0);
                $currentSize = $directory->getSize();
                //error_log(print_r("aftersize: ".$currentSize,true));
                $this->em->persist($directory);
                $this->em->flush();
                $directory = $this->em->getRepository("TwakeDriveBundle:DriveFile")->findOneBy(Array("id" => $directory->getId()));
                //error_log(print_r("get size: ".$directory->getSize(),true));
                $directory = $directory->getParentId();
                //error_log(print_r("parent id: ".$directory,true));
//                error_log("\n");
//                error_log("\n");
            }
        }
    }

    public function getRootEntity($workspace_id)
    {
        $root = $this->em->getRepository("TwakeDriveBundle:DriveFile")
            ->findOneBy(Array("workspace_id" => $workspace_id, "isintrash" => false, "parent_id" => ""));
        if (!$root) {
            $root = new DriveFile($workspace_id, "", true);
            $this->em->persist($root);
            $this->em->flush();
        }
        return $root;
    }

}

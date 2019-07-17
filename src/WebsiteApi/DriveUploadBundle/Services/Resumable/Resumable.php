<?php

namespace WebsiteApi\DriveUploadBundle\Services\Resumable;

use Cake\Filesystem\File;
use Cake\Filesystem\Folder;
use WebsiteApi\DriveUploadBundle\Entity\UploadState;

use WebsiteApi\DriveBundle\Services\DriveFileRefacto;


use Monolog\Logger;
use Monolog\Handler\StreamHandler;

use WebsiteApi\DriveUploadBundle\Services\Storage\EncryptionBag;

class Resumable
{
    public $debug = false;
    public $tempFolder = 'tmp';
    public $uploadFolder = 'test/files/uploads';
    // for testing
    public $deleteTmpFolder = true;
    protected $request;
    protected $response;
    protected $params;
    protected $chunkFile;
    protected $log;
    protected $filename;
    protected $filepath;
    protected $extension;
    protected $originalFilename;
    protected $isUploadComplete = false;
    protected $resumableOption = [
        'identifier' => 'identifier',
        'filename' => 'filename',
        'chunkNumber' => 'chunkNumber',
        'chunkSize' => 'chunkSize',
        'totalSize' => 'totalSize',
        'query' => 'query',
        'parent_id' => 'parent_id'
    ];
    protected $storagemanager;
    protected $doctrine;
    protected $driverefacto;
    protected $current_user;
    protected $previews;

    const WITHOUT_EXTENSION = true;

    public function __construct($doctrine, $storagemanager, $driverefacto, $previews)
    {
        $this->doctrine = $doctrine;
        $this->storagemanager = $storagemanager;
        $this->driverefacto = $driverefacto;
        $this->log = new Logger('debug');
        $this->log->pushHandler(new StreamHandler('debug.log', Logger::DEBUG));
        $this->previews = $previews;

        //$this->preProcess();
    }
    public function setResumableOption(array $resumableOption)
    {
        $this->resumableOption = array_merge($this->resumableOption, $resumableOption);
    }
    // sets original filename and extenstion, blah blah
    public function preProcess()
    {
        if (!empty($this->resumableParams())) {
            if (!empty($this->request->file())) {
                $this->extension = $this->findExtension($this->resumableParam('filename'));
                $this->originalFilename = $this->resumableParam('filename');
            }
        }
    }

    public function process($current_user)
    {
        if (!empty($this->resumableParams())) {
            if (!empty($this->request->file())) {
                $this->current_user = $current_user;
                return $this->handleChunk();
            } else {
                $this->handleTestChunk();
            }
        }
    }
    /**
     * Get isUploadComplete
     *
     * @return boolean
     */
    public function isUploadComplete()
    {
        return $this->isUploadComplete;
    }
    /**
     * Set final filename.
     *
     * @param string Final filename
     */
    public function setFilename($filename)
    {
        $this->filename = $filename;
        return $this;
    }
    /**
     * Get final filename.
     *
     * @return string Final filename
     */
    public function getFilename()
    {
        return $this->filename;
    }
    /**
     * Get final filename.
     *
     * @return string Final filename
     */
    public function getOriginalFilename($withoutExtension = false)
    {
        if ($withoutExtension === static::WITHOUT_EXTENSION) {
            return $this->removeExtension($this->originalFilename);
        }
        return $this->originalFilename;
    }
    /**
     * Get final filapath.
     *
     * @return string Final filename
     */
    public function getFilepath()
    {
        return $this->filepath;
    }
    /**
     * Get final extension.
     *
     * @return string Final extension name
     */
    public function getExtension()
    {
        return $this->extension;
    }

    public function CreateObject($identifier,$filename,$extension){

//        $uploadstate = $this->doctrine->getRepository("TwakeDriveUploadBundle:UploadState")->findBy(Array());
//        foreach ($uploadstate as $u){
//            $this->doctrine->remove($u);
//            $this->doctrine->flush();
//        }

        $chunklist = Array();
        $uploadstate = new UploadState($identifier,$filename,$extension,$chunklist);
        $new_key = hash('sha256', $identifier);
        $uploadstate->setEncryptionKey($new_key);
        $this->doctrine->persist($uploadstate);
        $this->doctrine->flush();
    }

    public function handleTestChunk()
    {

        $identifier = $this->resumableParam($this->resumableOption['identifier']);
        $filename = $this->resumableParam($this->resumableOption['filename']);
        $chunkNumber = $this->resumableParam($this->resumableOption['chunkNumber']);


        if (!$this->isChunkUploaded($identifier, $filename, $chunkNumber)) {
            return $this->response->header(204);
        } else {
            return $this->response->header(200);
        }
    }

    public function handleChunk()
    {
        //  VERIFIER IDENTIFIER QU ON A BIEN QUE DES CHIFFRES ET DES LETTRES ET PAS UN REQUETE OU AUTRES.
        $file = $this->request->file();
        $identifier = $this->resumableParam($this->resumableOption['identifier']);
        $filename = $this->resumableParam($this->resumableOption['filename']);
        $chunkNumber = $this->resumableParam($this->resumableOption['chunkNumber']);
        $chunkSize = $this->resumableParam($this->resumableOption['chunkSize']);
        $totalSize = $this->resumableParam($this->resumableOption['totalSize']);

        $finalname = $identifier.".chunk_".$chunkNumber;

        if (!$this->isChunkUploaded($identifier, $finalname, $chunkNumber)) {

            $chunkFile = $this->tmpChunkDir() . DIRECTORY_SEPARATOR . $finalname;
            $this->moveUploadedFile($file['tmp_name'], $chunkFile);
            //error_log(print_r($this->tmpChunkDir($identifier),true));
            //error_log(print_r(posix_getcwd() ,true));
            $chunktoadd = "chunk_" . $chunkNumber;

            $uploadstate = $this->doctrine->getRepository("TwakeDriveUploadBundle:UploadState")->findOneBy(Array("identifier" => $identifier));
            $key = $uploadstate->getEncryptionKey();
            //error_log(print_r($key,true));

            $param_bag = new EncryptionBag($key, "let's try a salt", "OpenSSL-2");
            $this->storagemanager->write($chunkFile, $param_bag);
            $this->doctrine->clear();
            $uploadstate = $this->doctrine->getRepository("TwakeDriveUploadBundle:UploadState")->findOneBy(Array("identifier" => $identifier));
            $uploadstate->addChunk($chunktoadd);
            $this->doctrine->persist($uploadstate);
            $this->doctrine->flush();
            error_log(print_r($uploadstate->getChunklist(), true));

            $numOfChunks = intval($totalSize / $chunkSize);
            if($numOfChunks == 1 && $chunkNumber ==1 ){
//            //on doit reconstituer le fichier pour pouvoir en faire une preview.
//
//            $path = $this->createFileAndDeleteTmp($this->previews["path"], $filename);
//            for ($i = 1; $i <= $numOfChunks; $i++) {
//                $name = $uploadstate->getIdentifier() . ".chunk_" . $i;
//                $chunkFile = $this->previews["path"] . DIRECTORY_SEPARATOR . $name;
//                //error_log(print_r($chunkFile,true));
//                $this->createFileFromChunks($chunkFile,$path);
//            }
                // 1 chunk on genere la preview dans le dossier
                $chunkFile = $this->previews["path"] . DIRECTORY_SEPARATOR . $finalname;
                $this->moveUploadedFile($file['tmp_name'], $chunkFile);
            }
        }

        if ( isset($uploadstate) && $uploadstate->getChunk() == $numOfChunks && count($uploadstate->getChunklist()) == $numOfChunks ) {
            error_log("fin upload");
            $this->isUploadComplete = true;
            $uploadstate->setSuccess(true);
            $uploadstate->setChunk($chunkNumber);
            $this->doctrine->persist($uploadstate);
            $this->doctrine->flush();

            //error_log(print_r($this->current_user,true));

            //recupere les données dans la requete pour connaitre l'id, le parent, le workspace etc

            $parent_id = $_POST['parent_id'];
            $workspace_id = $_POST['workspace_id'];
            $front_id = $_POST['front_id'];

            $data = Array("upload mode" => "chunk", "identifier" => $identifier ,"nb chunk" => $chunkNumber);

            //$object = Array("parent_id" => $parent_id, "workspace_id" => $workspace_id, "front_id" => $front_id, "name" => "filefortest");
            //$options = Array("new" => true, "data" => $data);

            //on cree le drive file, son versinnig et on set la taille


//            $fileordirectory = $this->driverefacto->save($object,$options,$current_user);
//            $fileordirectory->setSize($totalSize);
//            $this->doctrine->persist($fileordirectory);
//            $this->doctrine->flush();

        }
        return $chunkFile;
    }

    public function isChunkUploaded($identifier, $filename, $chunkNumber)
    {
        $part = explode("_",$filename)[0];
        $chemin = $this->tmpChunkDir($identifier) . DIRECTORY_SEPARATOR . $part . "_" . $chunkNumber;
        //error_log("chemin");
        //error_log(print_r($chemin,true));

        $file = new File($chemin);

        //$file = new File($this->tmpChunkDir($identifier) . DIRECTORY_SEPARATOR . $filename);
//        error_log("passage");
//        if($file->exists() == 1)
//            return true;
//        else
//            return false;
        return $file->exists();
    }

//    public function isFileUploadComplete($filename, $identifier, $chunkSize, $totalSize)
//    {
//        //error_log("cc");
//        if ($chunkSize <= 0) {
//            return false;
//        }
//        $numOfChunks = intval($totalSize / $chunkSize) + ($totalSize % $chunkSize == 0 ? 0 : 1);
//        //$numOfChunks= intval($totalSize / $chunkSize) ;
//        for ($i = 1; $i < $numOfChunks; $i++) {
//            if (!$this->isChunkUploaded($identifier, $filename, $i)) {
//                return false;
//            }
//        }
//
//        return true;
//    }


    public function moveUploadedFile($file, $destFile)
    {
        $file = new File($file);
        if ($file->exists()) {
            return $file->copy($destFile);
        }
        return false;
    }

    public function tmpChunkFilename($filename, $chunkNumber)
    {
        return $filename . '.' . str_pad($chunkNumber, 4, 0, STR_PAD_LEFT);
    }

    public function Updateparam($request, $response){
        $this->setRequest($request);
        $this->setResponse($response);
        $this->setTempFolder("uploads");
        $this->preProcess();
    }

    public function downloadFile()
    {

        $uploadstate = $this->doctrine->getRepository("TwakeDriveUploadBundle:UploadState")->findBy(Array());
        //var_dump(count($uploadstate));
        //var_dump($uploadstate);
        foreach ($uploadstate as $upload){
            $this->doctrine->remove($upload);
        }
        $this->doctrine->flush();

        $uploadstate = $this->doctrine->getRepository("TwakeDriveUploadBundle:UploadState")->findOneBy(Array("filename" => "fichier1go.txt"));
        $param_bag = new EncryptionBag("testkey","let's try a salt", "OpenSSL-2");
        $path = $this->createFileAndDeleteTmp("uploads", "fichier1go.txt");

        for ($i = 1; $i <= $uploadstate->getChunk(); $i++) {
            $chunkFile = $uploadstate->getIdentifier() . ".chunk_" . $i;
            $this->storagemanager->read($chunkFile,$param_bag);
            $chunkFile = "uploads" . DIRECTORY_SEPARATOR . $chunkFile . ".decrypt";
            $this->createFileFromChunks($chunkFile,$path);
        }
    }

    public function createFileFromChunks($chunkFile, $destFile)
    {
        $this->log('Beginning of create files from chunks');
        //natsort($chunkFiles);
        //error_log(print_r($chunkFile,true));
        $handle = $this->getExclusiveFileHandle($destFile);
        //error_log(print_r($handle,true));
        if (!$handle) {
            return false;
        }
        $destFile = new File($destFile);
        $destFile->handle = $handle;

        $file = new File($chunkFile);
        //var_dump($destFile->read());
        $destFile->append($file->read());
        @unlink($chunkFile);
        $this->log('Append ', ['chunk file' => $chunkFile]);

        $this->log('End of create files from chunks');
        return $destFile->exists();
    }

    /**
     * Create the final file from chunks
     */
    private function createFileAndDeleteTmp($folder, $filename)
    {
        //$tmpFolder = new Folder($this->tmpChunkDir($identifier));
        //$chunkFiles = $tmpFolder->read(true, true, true)[1];
        // if the user has set a custom filename
        if (null !== $this->filename) {
            $finalFilename = $this->createSafeFilename($this->filename, $filename);
        } else {
            $finalFilename = $filename;
        }
        // replace filename reference by the final file
        return $this->filepath = $folder . DIRECTORY_SEPARATOR . $finalFilename;

//        $this->extension = $this->findExtension($this->filepath);
//        if ($this->createFileFromChunks($chunkFiles, $this->filepath) && $this->deleteTmpFolder) {
//            $tmpFolder->delete();
//            $this->uploadComplete = true;
//        }
    }

    /**
     * Makes sure the orginal extension never gets overriden by user defined filename.
     *
     * @param string User defined filename
     * @param string Original filename
     * @return string Filename that always has an extension from the original file
     */
//    private function createSafeFilename($filename, $originalFilename)
//    {
//        $filename = $this->removeExtension($filename);
//        $extension = $this->findExtension($originalFilename);
//        return sprintf('%s.%s', $filename, $extension);
//    }

    public function getExclusiveFileHandle($name)
    {
        // if the file exists, fopen() will raise a warning
        $previous_error_level = error_reporting();
        error_reporting(E_ERROR);
        $handle = fopen($name, 'a');
        error_reporting($previous_error_level);
        return $handle;
    }

    private function resumableParam($shortName)
    {
        $resumableParams = $this->resumableParams();
        if (!isset($resumableParams['resumable' . ucfirst($shortName)])) {
            return null;
        }
        return $resumableParams['resumable' . ucfirst($shortName)];
    }
    public function resumableParams()
    {
        if ($this->request->is('get')) {
            return $this->request->data('get');
        }
        if ($this->request->is('post')) {
            return $this->request->data('post');
        }
    }

    public function tmpChunkDir()
    {
        //$tmpChunkDir = $this->tempFolder . DIRECTORY_SEPARATOR . $identifier;
        $tmpChunkDir = $this->tempFolder;
        if (!file_exists($tmpChunkDir)) {
            mkdir($tmpChunkDir);
        }
        return $tmpChunkDir;
    }

    public function setRequest($request)
    {
        $this->request = $request;
    }
    public function setResponse($response)
    {
        $this->response = $response;
    }

    public function setTempFolder($tempFolder)
    {
        $this->tempFolder = $tempFolder;
    }

    private function log($msg, $ctx = array())
    {
        if ($this->debug) {
            $this->log->addDebug($msg, $ctx);
        }
    }
    private function findExtension($filename)
    {
        $parts = explode('.', basename($filename));
        return end($parts);
    }
    private function removeExtension($filename)
    {
        $parts = explode('.', basename($filename));
        $ext = end($parts); // get extension
        // remove extension from filename if any
        return str_replace(sprintf('.%s', $ext), '', $filename);
    }

}
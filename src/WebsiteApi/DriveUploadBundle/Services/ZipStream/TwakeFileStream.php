<?php
declare(strict_types=1);

namespace WebsiteApi\DriveUploadBundle\Services\ZipStream;

use RuntimeException;
use WebsiteApi\DriveUploadBundle\Services\Storage\AdapterInterface;

//class TwakeFileStream extends Stream
class TwakeFileStream implements StreamInterface
{

    private $manager;
    private $param_bag;
    private $uploadstate;

    private $totalchunk;
    private $current_chunk;
    private $stream;

    public function __construct($manager, $param_bag, $uploadstate)
    {
        $this->manager = $manager;
        $this->param_bag = $param_bag;
        $this->uploadstate = $uploadstate;
        $this->current_chunk = 1;
        $this->totalchunk = $this->uploadstate->getChunk();
        $this->stream = $this->manager->read("original_stream", $this->current_chunk, $this->param_bag, $this->uploadstate);

    }

    public function __destruct()
    {
        $this->close();
    }

    public function __toString(){
        try {
            $this->seek(0);
        } catch (\RuntimeException $e) {}
        return (string) stream_get_contents($this->stream);

    }

    public function close(){
        if (is_resource($this->stream)) {
            fclose($this->stream);
        }
        $this->detach();

    }

    public function detach(){
        $result = $this->stream;
        $this->stream = null;
        return $result;
    }

    public function getSize(){
        $stats = fstat($this->stream);
        return $stats['size'] + 1;
    }

    public function tell(){

        $position = ftell($this->stream);
        if ($position === false) {
            throw new RuntimeException;
        }
        return $position;

    }

    public function isSeekable(){
        return (bool)$this->getMetadata('seekable');

    }

    public function seek($offset, $whence = SEEK_SET){
        if (!$this->isSeekable()) {
            throw new RuntimeException;
        }
        if (fseek($this->stream, $offset, $whence) !== 0) {
            throw new RuntimeException;
        }

    }

    public function rewind(){
        $this->seek(0);
        $this->current_chunk = 1;
        $this->manager->read("original_stream", $this->current_chunk, $this->param_bag, $this->uploadstate);

    }

    public function isWritable(){
        return false;
    }

    public function write($string){
        return false;
    }

    public function isReadable(){
        return true;
    }

    public function getContents(){
        if (!$this->isReadable()) {
            throw new RuntimeException;
        }
        $result = stream_get_contents($this->stream);
        if ($result === false) {
            throw new RuntimeException;
        }
        return $result;
    }

    public function read($length){

        //error_log(print_r(stream_get_meta_data($this->stream),true));
        $retour = fread($this->stream, $length);
        if ($retour === false) {
            throw new RuntimeException;
        }
        if($this->eof()){
            if($this->current_chunk < $this->totalchunk){
                //todo : probleme avec les close des stream des differents chunk
//                try{
//                    fclose($this->stream);
//                }catch (\Exception $e) {
//                    error_log($e->getTraceAsString());
//                    error_log($e->getMessage());
//                    die("ERROR with fclose");
//                }
                $path = realpath(stream_get_meta_data($this->stream)["uri"]);
                $valid = preg_match("/\/tmp\/.*/", $path);
                if(file_exists($path) && !is_dir($path) && $valid){
                    error_log(print_r($path,true));
                    @unlink($path);
                }

                $this->current_chunk = $this->current_chunk +1;
                $this->stream = $this->manager->read("original_stream", $this->current_chunk, $this->param_bag, $this->uploadstate);

                if($length - strlen($retour) > 0) {
                    $retour = $retour . $this->read($length - strlen($retour));
                }
            }
            else{
                $path = stream_get_meta_data($this->stream)["uri"];
                $valid = preg_match("/\/tmp\/.*/", $path);
                if(file_exists($path) && !is_dir($path) && $valid){
                    error_log(print_r($path,true));
                    @unlink($path);
                }
                //fclose($this->stream);
            }
        }
        return $retour;
    }


    public function eof(){

        return feof($this->stream);
    }

    public function getMetadata($key = null){

        $metadata = stream_get_meta_data($this->stream);
        return $key !== null ? @$metadata[$key] : $metadata;
    }
}

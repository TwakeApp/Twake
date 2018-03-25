<?php



namespace WebsiteApi\DiscussionBundle\Services;

use WebsiteApi\DiscussionBundle\Entity\Stream;
use WebsiteApi\CoreBundle\Services\StringCleaner;
use Symfony\Component\Security\Core\Authorization\AuthorizationChecker;
use WebsiteApi\DiscussionBundle\Entity\StreamMember;
use WebsiteApi\DiscussionBundle\Model\StreamSystemInterface;

/**
 * Manage contacts
 */
class StreamSystem implements StreamSystemInterface
{

    var $string_cleaner;
    var $doctrine;
    var $security;
    var $pusher;
    var $levelManager;
    var $messageReadSystem;
    var $callSystem;
    var $messageSystem;
    var $app_workspace_members;
    var $app_contacts;

    function __construct(StringCleaner $string_cleaner, $doctrine, AuthorizationChecker $authorizationChecker, $pusher, $app_contacts, $levelManager, $app_workspace_members, $messageReadSystem,$callSystem,$messageSystem)
    {
	    $this->string_cleaner = $string_cleaner;
	    $this->doctrine = $doctrine;
	    $this->security = $authorizationChecker;
	    $this->pusher = $pusher;
	    $this->app_contacts = $app_contacts;
	    $this->levelManager = $levelManager;
	    $this->app_workspace_members = $app_workspace_members;
	    $this->messageReadSystem = $messageReadSystem;
	    $this->callSystem = $callSystem;
	    $this->messageSystem = $messageSystem;
    }

    public function createStream($user,$workspaceId,$streamName,$streamDescription,$streamIsPrivate,$type="stream")
    {

        $workspace = $this->doctrine->getRepository("TwakeWorkspacesBundle:Workspace")->findOneBy(Array("id" => $workspaceId, "isDeleted" => false));
        if ($workspace == null) {
            return false;
        }
        if(!$this->levelManager->can($workspace, $user, "Messages:read")){
            return false;
        }
        if (!$this->levelManager->hasRight($user, $workspace, "Messages:manage")) {
            return false;
        }
        else {
            $stream = new Stream($workspace, $streamName, $streamIsPrivate,$streamDescription);
            $stream->setType($type);
            $this->doctrine->persist($stream);
            $link = $stream->addMember($user);
            $this->doctrine->persist($link);
            $this->doctrine->flush();

            $this->messageSystem->sendMessage(null,$stream->getAsArray()["key"],false,null,true,
                "This is the first message.");

            $isRead = $this->messageReadSystem->streamIsReadByKey($stream,$user);
            $callInfos = $this->callSystem->getCallInfo($user,$stream->getId());

            error_log(json_encode($stream->getAsArray()));

            $retour = array_merge($stream->getAsArray(),Array("isRead"=>$isRead,"call"=>$callInfos));

            return $retour;
        }

    }

    public function deleteStream($user,$streamKey){
        if($streamKey != null){
            $stream = $this->messageSystem->getStream($streamKey);
            if(!$stream || $stream["type"]!="stream"){
            	return false;
            }
	        $stream = $stream["object"];

            if(!$this->levelManager->can($stream->getWorkspace(), $user, "Messages:read")){
                return false;
            }
            if (!$this->levelManager->hasRight($user, $stream->getWorkspace(), "Messages:manage")) {
                return false;
            }

            if($stream){
                $messages = $this->doctrine->getRepository("TwakeDiscussionBundle:Message")
	                ->findBy(Array("streamReciever"=>$stream));
                foreach ($messages as $message){
                    $this->doctrine->remove($message);
                }
                $this->doctrine->remove($stream);
                $this->doctrine->flush();
                return true;
            }
        }
        return false;
    }

    public function editStream($user,$streamKey,$name,$streamDescription,$isPrivate,$members){

        $stream = $this->messageSystem->getStream($streamKey);
	    if(!$stream || $stream["type"]!="stream"){
		    return false;
	    }
	    $stream = $stream["object"];

        if($stream != null) {
            $workspace = $this->doctrine->getRepository("TwakeWorkspacesBundle:Workspace")
                ->findOneBy(Array("id" => $stream->getWorkspace()->getId(), "isDeleted" => false));
            if ($workspace == null) {
                return false;
            }
            if(!$this->levelManager->can($workspace, $user, "Messages:read")){
                return false;
            }
            if (!$this->levelManager->hasRight($user, $workspace, "Messages:manage")) {
                return false;
            }
            $stream->setName($name);
            $stream->setDescription($streamDescription);
            $stream->setIsPrivate($isPrivate);
            $membersInStream = $stream->getMembers();
            foreach ($membersInStream as $member) {
                if (!in_array($member->getId(), $members)) { // user remove
                    $link = $stream->getLinkUser($member);
                    if ($link) {
                        $this->doctrine->remove($link);
                    }
                } else { // user not remove
                    $index = array_search($member->getId(), $members);
                    $member = array_splice($members, $index, 1);
                }
            }
            foreach ($members as $memberId) { // user to invite
                $user = $this->doctrine->getRepository("TwakeUsersBundle:User")->find($memberId);
                if ($user != null) {
                    $link = $stream->addMember($user);
                    $this->doctrine->persist($link);
                }
            }
            $this->doctrine->flush();
            $isRead = $this->messageReadSystem->streamIsReadByKey($stream,$user);
            $callInfos = $this->callSystem->getCallInfo($user,$stream->getId());
            $retour = array_merge($stream->getAsArray(),Array("isRead"=>$isRead,"call"=>$callInfos));
            return $retour;
        }
    }

    public function getStreamList($workspaceId, $user){
        $workspace = $this->doctrine->getRepository("TwakeWorkspacesBundle:Workspace")
	        ->findOneBy(Array("id"=>$workspaceId,"isDeleted"=>false));
        if($workspace == null){
            return false;
        }
        else{

            if(!$this->levelManager->can($workspace, $user, "Messages:read")){
                return false;
            }

	        //Workspace streams
	        $streams = $this->doctrine->getRepository("TwakeDiscussionBundle:Stream")->findBy(Array("workspace"=>$workspace));
	        $retour = Array("stream"=>Array(), "user"=>Array());
	        foreach($streams as $stream){
		        $linkStream = $this->doctrine->getRepository("TwakeDiscussionBundle:StreamMember")->findOneBy(Array("user"=>$user,"stream"=>$stream));
	        	if($linkStream == null && !$stream->getIsPrivate()){
			        $linkStream = $stream->addMember($user);
	        		$this->doctrine->persist($linkStream);
		        }
		        if($linkStream!=null){ //public stream

			        $isRead = $this->messageReadSystem->streamIsReadByKey($stream,$user);
			        $callInfos = $this->callSystem->getCallInfo($user,$stream->getAsArray()["key"]);
			        $retour["stream"][] = array_merge($stream->getAsArray(),Array(
			        	"isRead"=>$isRead,
				        "call"=>$callInfos,
				        "mute"=>$linkStream->getMute()
			        ));
		        }
	        }
	        $this->doctrine->flush();

            //Member streams
	        $members = Array();
            if($workspace->getUser()!=null){ // this is private ws
                $members = $this->app_contacts->getAll($user, true);
            }
            else{
	            $members_array = $this->app_workspace_members->getMembers($workspaceId);
                foreach ($members_array as $member){
	                $members[] = $member["user"];
                }
            }
            foreach($members as $member){
                $key = "u-".min($user->getId(),$member->getId())."_".max($user->getId(),$member->getId());
                $stream = $this->messageSystem->getStream($key, $user);
                if($stream) {
	                $linkStream = $this->doctrine->getRepository("TwakeDiscussionBundle:StreamMember")->findOneBy(Array("user"=>$user,"stream"=>$stream));

	                $stream = $stream["object"];
	                $isRead = $this->messageReadSystem->streamIsReadByKey($stream,$user);
	                $callInfos = $this->callSystem->getCallInfo($user,$stream->getAsArray()["key"]);
	                $retour["stream"][] = array_merge($stream->getAsArray(),Array(
	                	"isRead"=>$isRead,
		                "call"=>$callInfos,
		                "contact"=>$member->getAsArray(),
		                "mute"=>$linkStream->getMute()
	                ));
                }
            }

            return $retour;
        }
    }

    public function mute($user, $streamId, $mute = true){

	    $stream = $this->doctrine->getRepository("TwakeDiscussionBundle:Stream")->find($streamId);
	    $member = $this->doctrine->getRepository("TwakeDiscussionBundle:StreamMember")->findOneBy(Array("user"=>$user,"stream"=>$stream));

	    if($stream==null || $member==null){
		    return false;
	    }

	    $member->setMute($mute);
	    $this->doctrine->persist($member);
	    $this->doctrine->flush();

	    return true;

    }

}
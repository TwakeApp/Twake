<?php
namespace DevelopersApiV1\CalendarBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use \Eluceo\iCal\Component ;

class EventController extends Controller
{
    /**
     *
     * @param Request $request
     * @param $workspace_id
     * @param $calendar_id
     * @return JsonResponse
     */
    public function createEventAction(Request $request,$workspace_id,$calendar_id){

        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $content = $this->get("api.v1.check")->get($request);

        if($content === false ){
            return new JsonResponse($this->get("api.v1.api_status")-> getError(4000));
        }

        $event = Array() ;
        $participants = Array();

        $event["from"] = isset($content["from"])? $content["from"]: 0 ;
        $event["to"] = isset($content["to"])? $content["to"]: 0 ;

        $result= $this->get("app.calendar_events")->createEvent($workspace_id, $calendar_id, $event, null, false, $participants);

        if($result == false || $result ==null){
            $data = $this->get("api.v1.api_status")->getError(4007);
        }else{
            $data = $this->get("api.v1.api_status")->getSuccess();
            $data["data"] = $result->getAsArray();
        }

        return new JsonResponse($data);

    }

    /**
     *
     * @param Request $request
     * @param $workspace_id
     * @param $event_id
     * @param $calendar_id
     * @return JsonResponse
     */
    public function deleteEventAction(Request $request, $workspace_id, $event_id, $calendar_id){

        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $result = $this->get("app.calendar_events")->removeEvent($workspace_id, $calendar_id, $event_id, null);

        if($result == false || $result == null){
            $data = $this->get("api.v1.api_status")->getError(4008);
        }else{
            $data = $this->get("api.v1.api_status")->getSuccess();
        }

        return new JsonResponse($data);
    }

    /**
     * @param Request $request
     * @param $workspace_id
     * @param $event_id
     * @return JsonResponse
     */
    public function editEventAction(Request $request, $workspace_id, $event_id){

        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $content = $this->get("api.v1.check")->get($request);

        if($content === false ){
            return new JsonResponse($this->get("api.v1.api_status")-> getError(4000));
        }

        $olderData =$this->get("app.calendar_events")->getEventById($workspace_id, $event_id, null);
        $olderEvent = $olderData["event"];

        $calendar = isset($content["calendar"])? $content["calendar"] : $olderData["calendar"];
        $olderEvent["from"] = isset($content["from"])? $content["from"]: $olderEvent["from"];
        $olderEvent["to"] = isset($content["to"])? $content["to"]: $olderEvent["to"];
        $olderEvent["title"] = isset($content["title"])? $content["title"] : $olderEvent["title"] ;
        $olderEvent["typeEvent"] = isset($content["typeEvent"])? $content["typeEvent"]: $olderEvent["typeEvent"] ;

        $result =($this->get("app.calendar_events")->updateEvent($workspace_id, $calendar, $event_id, $olderEvent, null))->getAsArray();

        if($result == false || $result ==null){
            $data = $this->get("api.v1.api_status")->getError(4009);
        }else{
            $data = $this->get("api.v1.api_status")->getSuccess();
            $data["data"] = $result;
        }

        return new JsonResponse($data);
    }

    /**
     * @param Request $request
     * @param $workspace_id
     * @param $event_id
     * @return JsonResponse
     */
    public function getEventAction(Request $request, $workspace_id, $event_id){

        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $result = $this->get("app.calendar_events")->getEventById($workspace_id, $event_id, null);

        if($result == false || $result ==null){
            $data = $this->get("api.v1.api_status")->getError(4010);
        }else{
            $data = $this->get("api.v1.api_status")->getSuccess();
            $data["data"] = $result;
        }

        return new JsonResponse($data);
    }

    /**
     * @param Request $request
     * @param $workspace_id
     * @param $calendar_id
     * @return JsonResponse
     */
    public function getAllEventAction(Request $request, $workspace_id, $calendar_id){

        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $result = $this->get("app.calendar_events")->getEventsByCalendar($workspace_id,$calendar_id, null);

        if($result == false || $result ==null){
            $data = $this->get("api.v1.api_status")->getError(4013);
        }else{
            $data = $this->get("api.v1.api_status")->getSuccess();
            $data["data"] = $result;
        }

        return new JsonResponse($data);
    }

    /**
     * @param Request $request
     * @param $workspace_id
     * @param $event_id
     * @param $calendar_id
     * @param $user_id
     * @return JsonResponse
     */
    public function shareAction(Request $request, $workspace_id, $event_id, $calendar_id, $user_id){
        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $error = $this->get("app.calendar_events")->addUsers($workspace_id, $calendar_id, $event_id, Array($user_id), null);

        $result = $this->get("app.calendar_events")->getEventById($workspace_id, $event_id, null);

        if($error == false || $error ==null){
            $data = $this->get("api.v1.api_status")->getError(4011);
        }else if($result == false || $result ==null){
            $data = $this->get("api.v1.api_status")->getError(4009);
        }else{
            $data = $this->get("api.v1.api_status")->getSuccess();
            $data["data"] = $result;
        }

        return new JsonResponse($data);

    }

    /**
     * @param Request $request
     * @param $workspace_id
     * @param $event_id
     * @param $user_id
     * @param $calendar_id
     * @return JsonResponse
     */
    public function unshareAction(Request $request, $workspace_id, $event_id, $user_id, $calendar_id){
        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $error = $this->get("app.calendar_events")->removeUsers($workspace_id, $calendar_id, $event_id,Array($user_id), null);

        $result = $this->get("app.calendar_events")->getEventById($workspace_id, $event_id, null);

        if($error == false || $error ==null){
            $data = $this->get("api.v1.api_status")->getError(40012);
        }else if($result == false || $result ==null){
            $data = $this->get("api.v1.api_status")->getError(4009);
        }else{
            $data = $this->get("api.v1.api_status")->getSuccess();
            $data["data"] = $result;
        }

        return new JsonResponse($data);
    }

    /**
     * see https://github.com/markuspoerschke/iCal
     * @param Request $request
     * @param $workspace_id
     * @param $event_id
     * @return string|JsonResponse
     */
    public function generateIcsFileAction(Request $request,$workspace_id, $event_id){
        $application = $this->get("api.v1.check")->check($request);

        if(!$application){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(1));
        }

        if(!$this->get("api.v1.check")->isAllowedTo($application,"calendar:manage", $workspace_id)){
            return new JSonResponse($this->get("api.v1.api_status")-> getError(2));
        }

        $vCalendar = new Component\Calendar('twakeapp.com');
        $vEvent = new Component\Event();

        $tz  = 'Europe/Paris';
        date_default_timezone_set($tz);

        $data =$this->get("app.calendar_events")->getEventById($workspace_id, $event_id, null);
        $event = $data["event"];

        $dateStart = new \DateTime(date( "c", (int)$event["from"]));
       // $dateStart = (new \DateTime($event["start"]));
        $dateEnd = new \DateTime(date("c",(int)$event["to"]));
        //$dateEnd = new \DateTime($event["end"]);

        $vEvent
            ->setDtStart($dateStart)
            ->setDtEnd($dateEnd)
            ->setSummary($event["title"])
            ->setDescription($event["description"])
            ->setLocation($event["location"])

        ;
        $vEvent->setUseTimezone(true);


        $vCalendar->addComponent($vEvent);

        return new Response(
            $vCalendar->render(), 200, array(
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="cal.ics"',
        )); // split sur les \r\n et autres types de prog

    }

}

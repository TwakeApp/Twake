<?php

namespace Twake\Discussion\Controller;

use Common\BaseController;
use Common\Http\Response;
use Common\Http\Request;


class Discussion extends BaseController
{

    public function remove(Request $request)
    {
        $options = $request->request->get("options");
        $object = $request->request->get("object");

        if ($object["ephemeral_id"]) {
            return new Response(Array("status" => "cancelled"));
        }

        $res = $this->get("app.messages")->remove($object, $options, $this->getUser());
        if (!$res) {
            return new Response(Array("status" => "error"));
        }

        return new Response(Array("data" => Array("object" => $res)));
    }

    public function save(Request $request)
    {
        $options = $request->request->get("options");
        $object = $request->request->get("object");
        $res = $this->get("app.messages")->save($object, $options, $this->getUser());
        if (!$res) {
            return new Response(Array("status" => "error"));
        } else {
            if (!$object["id"]) {
                $this->get("administration.counter")->incrementCounter("total_messages", 1);
                if($GLOBALS["segment_enabled"]) \Segment::track([
                    "event" => "message:send",
                    "userId" => $this->getuser()->getIdentityProviderId() ?: $this->getUser()->getId()
                ]);
            }
        }

        return new Response(Array("data" => Array("object" => $res)));
    }

    public function getAction(Request $request)
    {
        $options = $request->request->get("options");
        $objects = $this->get("app.messages")->get($options, $this->getUser());
        if ($objects === false) {
            return new Response(Array("status" => "error"));
        }
        return new Response(Array("data" => $objects));
    }

    public function nodeRealTime(Request $request)
    {
        $token = explode(" ", getallheaders()["Authorization"])[1];
        $secret = $this->app->getContainer()->getParameter("node.secret");
        if($token != $secret){
            error_log("got node realtime request unauthorized");
            return new Response(Array("error" => "unauthorized"));
        }

        $context = $request->request->get("context");
        $entity = $request->request->get("entity");
        $participant = $request->request->get("participant");

        $channel_id = $participant["id"];
        $parent_message_id = $entity["thread_id"] === $entity["id"] ? "" : $entity["thread_id"];
        $removed = $entity["subtype"] == "deleted";

        $array = $this->get("app.messages")->convertFromNode($entity, [
            "channel_id" => $channel_id
        ]);

        if($removed){

            $event = Array(
                "client_id" => "system",
                "action" => "remove",
                "message_id" => $entity["id"],
                "thread_id" => $parent_message_id
            );
            $this->app->getServices()->get("app.pusher")->push($event, "channels/" . $channel_id . "/messages/updates");

        } else {

            $event = Array(
                "client_id" => "system",
                "action" => "update",
                "message_id" => $entity["id"],
                "thread_id" => $parent_message_id
            );
            $this->app->getServices()->get("app.pusher")->push($event, "channels/" . $channel_id . "/messages/updates");
        }
 
        $event = Array(
            "client_id" => "bot",
            "action" => "save",
            "object_type" => "",
            "object" => $array
        );
        $this->app->getServices()->get("app.websockets")->push("messages/" . $channel_id, $event);

        return new Response(Array("data" => "ok"));
    }


}

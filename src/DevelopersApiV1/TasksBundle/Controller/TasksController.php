<?php


namespace DevelopersApiV1\TasksBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class TasksController extends Controller
{
    public function removeTaskAction(Request $request)
    {
        $capabilities = ["tasks_task_remove"];

        $application = $this->get("app.applications_api")->getAppFromRequest($request, $capabilities);
        if (is_array($application) && $application["error"]) {
            return new JsonResponse($application);
        }

        $object = $request->request->get("object", null);
        $user = null;
        $object = $this->get("app.tasks.task")->remove($object, Array(), $user);

        $event = Array(
            "client_id" => "system",
            "action" => "remove",
            "object_type" => "",
            "front_id" => $object["front_id"]
        );

        //TODO ws update

        $this->get("administration.counter")->incrementCounter("total_api_tasks_operation", 1);

        return new JsonResponse(Array("result" => $object));
    }

    public function saveTaskAction(Request $request)
    {

        $capabilities = ["tasks_task_save"];

        $application = $this->get("app.applications_api")->getAppFromRequest($request, $capabilities);
        if (is_array($application) && $application["error"]) {
            return new JsonResponse($application);
        }

        $object = $request->request->get("object", null);
        $user = null;
        try {
            $object = $this->get("app.tasks.task")->save($object, Array(), $user);
        } catch (\Exception $e) {
            $object = false;
        }
        if (!$object) {
            return new JsonResponse(Array("error" => "unknown error or malformed query."));
        }

        if ($object) {

            $event = Array(
                "client_id" => "system",
                "action" => "save",
                "object_type" => "",
                "object" => $object
            );

            //TODO ws update

        }

        $this->get("administration.counter")->incrementCounter("total_api_tasks_operation", 1);

        return new JsonResponse(Array("object" => $object));

    }

    public function getBoardListAction(Request $request)
    {
        $privileges = ["workspace_tasks"];

        $application = $this->get("app.applications_api")->getAppFromRequest($request, [], $privileges);
        if (is_array($application) && $application["error"]) {
            return new JsonResponse($application);
        }
        $objects = false;
        $user_id = $request->request->get("user_id", "");
        $workspace_id = $request->request->get("workspace_id", "");
        if ($workspace_id) {
            if ($user_id) {
                $user_entity = $this->get("app.users")->getById($user_id, true);
            }
            if ($user_entity) {
                $objects = $this->get("app.tasks.board")->get(Array("workspace_id" => $workspace_id), $user_entity);
            }
        }

        if ($objects === false) {
            return new JsonResponse(Array("error" => "payload_error"));
        }

        $res = [];
        foreach ($objects as $object) {
            $res[] = $object;
        }

        $this->get("administration.counter")->incrementCounter("total_api_tasks_operation", 1);

        return new JsonResponse(Array("data" => $res));
    }
}
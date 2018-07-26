<?php

namespace WebsiteApi\ProjectBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;


class ListOfTasksController extends Controller
{


    public function getAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $boardId = $request->request->get("boardId", 0);
        $lists = $this->get("app.list_of_tasks_service")->getListOfTasks($boardId);

        if(!$lists) {
            $data["errors"][] = "Board not found or there are no task on this board";
        }
        else{
            foreach ($lists as $list)
            {
                $listArray = $list->getAsArray();
                $listArray["percentage"] = $this->get("app.list_of_tasks_service")->getListPercent($list);
                $data["data"][] = $listArray;
            }
        }

        return new JsonResponse($data);
    }

    private function convertObjectListToIdList($list){
        if(count($list)==0)
            return Array();

        $final = Array();

        foreach($list as $item) {
            if(is_int($item))
                return $list;
            $final[] = $item["id"];
        }

        return $final;
    }
    public function updateAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $listOfTasksId = $request->request->get("id", 0);
        $newTitle = $request->request->get("label", null);
        $newColor = $request->request->get("color", null);
        $userIdsToNotify = $this->convertObjectListToIdList($request->request->get("watch_members", Array()));

        if(!$this->get("app.list_of_tasks_service")->updateListOfTasks($listOfTasksId, $newTitle, $newColor,$userIdsToNotify)) {
            $data["errors"][] = "List of tasks not found";
        }
        else{
            $data["data"] = "success";
        }
        return new JsonResponse($data);
    }

    public function removeAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $listOfTaskId = $request->request->get("id", 0);

        if(!$this->get("app.list_of_tasks_service")->removeListOfTasks($listOfTaskId)) {
            $data["errors"][] = "List of tasks not found";
        }
        else{
            $data["data"] = "success";
        }

        return new JsonResponse($data);
    }

    public function moveAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $idsOrderMap = $request->request->get("ids", Array());
        $boardId = $request->request->get("boardId", 0);

        if(!$this->get("app.list_of_tasks_service")->moveListOfTasks($idsOrderMap, $boardId)) {
            $data["errors"][] = "List of tasks not found";
        }
        else{
            $data["data"] = "success";
        }

        return new JsonResponse($data);
    }

    public function createAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $newTitle = $request->request->get("label", "");
        $newColor = $request->request->get("color", "");
        $boardId = $request->request->get("boardId", 0);
        $userIdToNotify = $this->convertObjectListToIdList($request->request->get("watch_members", Array()));

        $listOfTasks  = $this->get("app.list_of_tasks_service")->createListOfTasks($newTitle, $newColor, $boardId,$userIdToNotify);
        if(!$listOfTasks) {
            $data["errors"][] = "Fail to create list of tasks";
        }
        else{
            $data["data"] = $listOfTasks->getAsArray();
        }

        return new JsonResponse($data);
    }
}
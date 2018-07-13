<?php

namespace WebsiteApi\ProjectBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;


class TaskController extends Controller
{


    public function getAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );
        $useMine = $request->request->get("mine");
        $workspaceId = $request->request->getInt("workspaceId");
        $to = $request->request->get("to");
        $from = $request->request->get("from", 0);
        $boardsIds = $request->request->get("boardsIds");

        if($useMine) {
            $tasks = $this->get("app.board_tasks")->getTasksForUser($workspaceId, $from, $to, $this->getUser()->getId());
        }else{
            $tasks = $this->get("app.board_tasks")->getTasksForWorkspace($workspaceId, $from, $to, $boardsIds, $this->getUser()->getId());
        }

        if($tasks){
            $tasks_formated = Array();
            foreach ($tasks as $task){
                $tasks_formated[] = $task->getAsArray();
            }
            $data["data"] = $tasks_formated;
        }

        return new JsonResponse($data);
    }
    public function getOneTaskAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );
        $taskId = $request->request->get("taskId");
        $workspaceId = $request->request->getInt("workspaceId");

        $task = $this->get("app.board_tasks")->getTask($taskId, $workspaceId, $this->getUser()->getId());

        if($task){
            $data["data"] = $task->getAsArray();
        }

        return new JsonResponse($data);
    }


    public function createAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $workspaceId = $request->request->get("workspaceId");
        $task = $request->request->get("task");
        $boardId = $request->request->get("boardId");
        $addMySelf = $request->request->get("addMe");
        $participants = $task["participant"];

        $task = $this->get("app.board_tasks")->createTask($workspaceId, $boardId, $task, $this->getUser()->getId(), $addMySelf, $participants);

        if($task == null){
            $data["errors"] = "error";
        }
        else{
            $data['data'] = $task->getAsArray();
        }

        return new JsonResponse($data);
    }

    public function updateAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $workspaceId = $request->request->get("workspaceId");
        $taskId = $request->request->get("taskId");
        $task = $request->request->get("task");
        $boardId = $request->request->get("boardId");

        $data['data'] = $this->get("app.board_tasks")->updateTask($workspaceId, $boardId, $taskId, $task, $this->getUser()->getId());

        return new JsonResponse($data);
    }

    public function removeAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $workspaceId = $request->request->get("workspaceId");
        $taskId = $request->request->get("taskId");
        $boardId = $request->request->get("boardId");

        $data['data'] = $this->get("app.board_tasks")->removeTask($workspaceId, $boardId, $taskId, $this->getUser()->getId());

        return new JsonResponse($data);
    }

    public function addUsersAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $workspaceId = $request->request->get("workspaceId");
        $taskId = $request->request->get("taskId");
        $boardId = $request->request->get("boardId");
        $usersId = $request->request->get("usersId");

        $data['data'] = $this->get("app.board_tasks")->addUsers($workspaceId, $boardId, $taskId, $usersId, $this->getUser()->getId());

        return new JsonResponse($data);
    }

    public function removeUsersAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $workspaceId = $request->request->get("workspaceId");
        $taskId = $request->request->get("taskId");
        $boardId = $request->request->get("boardId");
        $usersId = $request->request->get("usersId");

        $data['data'] = $this->get("app.board_tasks")->removeUsers($workspaceId, $boardId, $taskId, $usersId, $this->getUser()->getId());

        return new JsonResponse($data);
    }

    public function getUsersAction(Request $request)
    {
        $data = Array(
            'errors' => Array(),
            'data' => Array()
        );

        $taskId = $request->request->get("taskId");

        $data['data'] = $this->get("app.board_tasks")->getUsers( $taskId, $this->getUser()->getId());

        return new JsonResponse($data);
    }
}
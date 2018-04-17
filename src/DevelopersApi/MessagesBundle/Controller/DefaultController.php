<?php

namespace DevelopersApi\MessagesBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class DefaultController extends Controller
{
    public function newAction(Request $request)
    {
        $request = $this->get("api.CheckRightApplication")->getRequestData($request, Array("messages/write"));
        $requestData = $request["data"];

        if (isset($request["errors"])) {
            return new JsonResponse($request["errors"]);
        }

        $workspaceId = isset($requestData["workspaceId"]) ? $requestData["workspaceId"] : 0;
        $streamId = isset($requestData["streamId"]) ? $requestData["streamId"] : 0;
        $subjectId = isset($requestData["subjectId"]) ? $requestData["subjectId"] : 0;
        $userId = isset($requestData["userId"]) ? $requestData["userId"] : 0;
        $url = isset($requestData["url"]) ? $requestData["url"] : "";
        $appId = $request["application"]->getId();

        error_log(json_encode($requestData));

        $data = Array(
            "data" => Array(),
            "errors" => Array()
        );

        $file = $this->get("app.messages")->sendMessage($userId, $streamId, true, $appId, false, null, $workspaceId, $subjectId, Array("iframe" => $url));
        if (!$file) {
            $data["errors"][] = 3001;
        } else {
            $data["data"]["filename"] = $file->getName();
            $data["data"]["fileId"] = $file->getId();
        }

        return new JsonResponse($data);

    }
}

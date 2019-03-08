<?php
/**
 * Created by PhpStorm.
 * User: Romaric Mourgues
 * Date: 19/01/2017
 * Time: 10:38
 */

namespace WebsiteApi\WorkspacesBundle\Controller;

use PHPUnit\Util\Json;
use WebsiteApi\WorkspacesBundle\Entity\WorkspaceUser;
use WebsiteApi\WorkspacesBundle\Entity\Workspace;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;


class WorkspaceMembersController extends Controller
{
    /**
     * Get list of workspace members
     */
    public function getMembersAction(Request $request)
    {

        $response = Array("errors" => Array(), "data" => Array());

        $workspaceId = $request->request->get("workspaceId");
        $twake_bot = $request->request->get("twake_bot", false);
        $order = $request->request->get("order", null);
        $max = $request->request->get("max", null);
        $offset = $request->request->get("offset", null);

        $members = $this->get("app.workspace_members")->getMembers($workspaceId, $this->getUser()->getId(), $twake_bot, $order, $max, $offset);
        $list = Array();
        foreach ($members as $member) {
            $user = $member["user"]->getAsArray();
            if ($user["username"] == "twake_bot") {
                continue;
            }
            $list[] = Array(
                "user" => $user,
                "last_access" => $member["last_access"],
                "level" => $member["level"],
                "externe" => $member["externe"],
                "groupLevel" => $member["groupLevel"]
            );
        }

        $pendingMails = $this->get("app.workspace_members")->getPendingMembers($workspaceId, $this->getUser()->getId());

        $listMails = Array();
        foreach ($pendingMails as $mail) {
            $listMails[] = Array(
                "mail" => $mail->getMail()
            );
        }

        $response["data"] = Array(
            "mails" => $listMails,
            "members" => $list
        );

        return new JsonResponse($response);
    }

    /**
     * Add list of usernames or mails
     */
    public function addListAction(Request $request)
    {

        $response = Array("errors" => Array(), "data" => Array());

        $workspaceId = $request->request->get("workspaceId");
        $list = $request->request->get("list", "");
        $asExterne = $request->request->getBoolean("asExterne");

        $list = str_replace(Array(",", ";"), " ", $list);
        $list = preg_replace('!\s+!', ' ', $list);
        $list = explode(" ", $list);

        $added = Array("user"=>Array(),"pending"=>Array());
        $not_added = Array();
        foreach ($list as $element) {
            error_log("save ".$element);
            $element = trim($element);
            if (strrpos($element, "@") <= 0) { //No mail or "@username"
                $res = $this->get("app.workspace_members")->addMemberByUsername($workspaceId, $element, $asExterne, $this->getUser()->getId());
                if ($res) {
                    $added["user"][] = $element;
                } else {
                    $not_added[] = $element;
                }
            } else {
                $res = $this->get("app.workspace_members")->addMemberByMail($workspaceId, $element, $asExterne, $this->getUser()->getId());
                if($res == "user"){
                    $added["user"][] = $element;
                }
                elseif ($res == "mail"){
                    $added["pending"][] = $element;
                }
                else{
                    $not_added[] = $element;
                }
            }
        }

        $response["data"]["added"] = $added;
        $response["data"]["not_added"] = $not_added;

        return new JsonResponse($response);
    }

    /**
     * Remove e-mail wainting for add
     */
    public function removeMailAction(Request $request)
    {

        $response = Array("errors" => Array(), "data" => Array());

        $workspaceId = $request->request->get("workspaceId");
        $mail = $request->request->get("mail", "");

        $res = $this->get("app.workspace_members")
            ->removeMemberByMail($workspaceId, $mail, $this->getUser()->getId());

        $response["data"] = $res;

        return new JsonResponse($response);
    }

    /**
     * Remove list of members by ids
     */
    public function removeMembersAction(Request $request)
    {

        $response = Array("errors" => Array(), "data" => Array());

        $workspaceId = $request->request->get("workspaceId");
        $ids = $request->request->get("ids", Array());

        $removed = 0;
        foreach ($ids as $id) {
            $res = $this->get("app.workspace_members")
                ->removeMember($workspaceId, $id, $this->getUser()->getId());
            if ($res) {
                $removed++;
            }
        }

        $response["data"]["removed"] = $removed;

        return new JsonResponse($response);
    }

    /**
     * Change level of members
     */
    public function changeMembersLevelAction(Request $request)
    {

        $response = Array("errors" => Array(), "data" => Array());

        $workspaceId = $request->request->get("workspaceId");
        $ids = $request->request->get("usersId", Array());
        $levelId = $request->request->get("levelId");

        $updated = 0;
        foreach ($ids as $id) {
            $res = $this->get("app.workspace_members")
                ->changeLevel($workspaceId, $id, $levelId, $this->getUser()->getId());
            if ($res) {
                $updated++;
            }
        }

        $response["data"]["updated"] = $updated;

        return new JsonResponse($response);
    }


    public function getWorkspacesAction(Request $request)
    {
        $response = Array(
            "errors" => Array(),
            "data" => Array()
        );

        $workspaces = $this->get("app.workspace_members")->getWorkspaces($this->getUser()->getId());

        foreach ($workspaces as $workspace) {
            $response["data"][] = Array(
                "workspace" => $workspace["workspace"]->getAsArray(),
                "last_access" => $workspace["last_access"],
                "ishidden" => $workspace["ishidden"],
                "isfavorite" => $workspace["isfavorite"],
                "hasnotifications" => $workspace["hasnotifications"],
                "isArchived" => $workspace["isArchived"]            );
        }

        if (count($workspaces) == 0) {
            $response["errors"][] = "empty list";
        }


        return new JsonResponse($response);
    }

}

<?php


namespace Twake\Channels\Services;

use Twake\Channels\Entity\ChannelMember;
use Twake\Discussion\Entity\Channel;
use App\App;

class ChannelsNotificationsSystem extends ChannelSystemAbstract
{

    var $doctrine;
    var $notificationSystem;
    var $pusher;

    public function __construct(App $app)
    {
        $this->doctrine = $app->getServices()->get("app.twake_doctrine");
        $this->notificationSystem = $app->getServices()->get("app.notifications");
        $this->pusher = $app->getServices()->get("app.pusher");
    }

    public function newElement($channel, $sender_application = null, $sender_user = null, $message_as_text = "", $message = null)
    {

        if (is_string($channel)) {
            $channel = $this->doctrine->getRepository("Twake\Channels:Channel")->findOneBy(Array("id" => $channel));
        }

        $channel->setLastActivity(new \DateTime());
        $channel->setMessagesIncrement($channel->getMessagesIncrement() + 1);

        $membersRepo = $this->doctrine->getRepository("Twake\Channels:ChannelMember");
        $userRepo = $this->doctrine->getRepository("Twake\Users:User");
        /**
         * @var $members ChannelMember[]
         */
        $members = $membersRepo->findBy(Array("direct" => $channel->getDirect(), "channel_id" => $channel->getId()));

        $workspace = $channel->getOriginalWorkspaceId();
        $workspace_ent = $this->doctrine->getRepository("Twake\Workspaces:Workspace")->find($workspace);

        $users_to_notify = [];
        $users_to_notify_mention = [];

        foreach ($members as $member) {

            $mention = strpos(json_encode($message->getContent()), $member->getUserId()) !== false;
            $mention = $mention || strpos(json_encode($message->getContent()), "@here") !== false;
            $mention = $mention || strpos(json_encode($message->getContent()), "@all") !== false;

            $muted = $member->getMuted();
            if ($muted && $mention) {
                $muted = false;
            }

            if (!$muted && (!$sender_user || $member->getUserId() != $sender_user->getId())) {

                $user = $userRepo->find($member->getUserId());

                $member->setLastActivity(new \DateTime());

                $this->pusher->push(Array("type" => "update", "notification" => Array("channel" => $channel->getAsArray())), "notifications/" . $member->getUserId());

                //Updating workspace and group notifications
                if (!$channel->getDirect()) {

                    $this->addNotificationOnWorkspace($workspace, $user, false);

                }

                if($mention){
                  $users_to_notify_mention[] = $user;
                }else{
                  $users_to_notify[] = $user;
                }

            } else {
                $member->setLastMessagesIncrement($channel->getMessagesIncrement());
                $member->setLastAccess(new \DateTime());
            }
            $this->doctrine->persist($member);
        }

        $this->notificationSystem->pushNotification(
            null,
            $sender_application,
            $sender_user,
            $workspace_ent,
            $channel,
            $users_to_notify,
            "channel_" . $channel->getId(),
            $message_as_text,
            $message ? $message->getId() : "",
            Array(),
            Array("push"),
            true
        );

        $this->notificationSystem->pushNotification(
            null,
            $sender_application,
            $sender_user,
            $workspace_ent,
            $channel,
            $users_to_notify_mention,
            "channel_" . $channel->getId(),
            "@mentionned: ".$message_as_text,
            $message ? $message->getId() : "",
            Array(),
            Array("push"),
            true
        );

        $this->doctrine->persist($channel);

        $this->doctrine->flush();

    }

    public function addNotificationOnWorkspace($workspace_id, $user, $flush = true)
    {

        if (!$workspace_id) {
            return false;
        }

        //TODO also check all links of this channel when implemented
        if ($workspace_id) {

            $workspaceUsers = $this->doctrine->getRepository("Twake\Workspaces:WorkspaceUser");
            $workspaceUser = $workspaceUsers->findOneBy(Array("workspace" => $workspace_id, "user" => $user));

            if ($workspaceUser && !$workspaceUser->getHasNotifications()) {
                $workspaceUser->setHasNotifications(true);
                $this->doctrine->persist($workspaceUser);
                $this->pusher->push(Array("type" => "update", "notification" => Array("workspace_id" => $workspaceUser->getWorkspace()->getId(), "hasnotifications" => true)), "notifications/" . $user->getId());

                $groupUsers = $this->doctrine->getRepository("Twake\Workspaces:GroupUser");
                $groupUser = $groupUsers->findOneBy(Array("group" => $workspaceUser->getWorkspace()->getGroup(), "user" => $user));

                if ($groupUser && !$groupUser->getHasNotifications()) {
                    $groupUser->setHasNotifications(true);
                    $this->doctrine->persist($groupUser);
                    $this->pusher->push(Array("type" => "update", "notification" => Array("group_id" => $workspaceUser->getWorkspace()->getGroup()->getId(), "hasnotifications" => true)), "notifications/" . $user->getId());
                }

            }

        }

        if ($flush) {
            $this->doctrine->flush();
        }

        return true;

    }

    public function unread($channel, $user)
    {

        if (is_string($channel)) {
            $channel = $this->doctrine->getRepository("Twake\Channels:Channel")->findOneBy(Array("id" => $channel));
        }

        if (!$channel) {
            return false;
        }

        $membersRepo = $this->doctrine->getRepository("Twake\Channels:ChannelMember");
        /**
         * @var $member ChannelMember
         */
        $member = $membersRepo->findOneBy(Array("direct" => $channel->getDirect(), "channel_id" => $channel->getId(), "user_id" => $user->getId()));

        $member->setLastMessagesIncrement($channel->getMessagesIncrement() - 1);

        $array = $channel->getAsArray();
        $array["_user_last_message_increment"] = $member->getLastMessagesIncrement();
        $array["_user_last_access"] = $member->getLastAccess() ? $member->getLastAccess()->getTimestamp() : 0;
        $this->pusher->push(Array("type" => "update", "notification" => Array("channel" => $array)), "notifications/" . $user->getId());

        if ($channel->getOriginalWorkspaceId()) {
            $this->addNotificationOnWorkspace($channel->getOriginalWorkspaceId(), $user, false);
        }

        $this->doctrine->persist($member);
        $this->doctrine->flush();

        return true;

    }

    public function read($channel, $user)
    {

        if (is_string($channel)) {
            $channel = $this->doctrine->getRepository("Twake\Channels:Channel")->findOneBy(Array("id" => $channel));
        }

        if (!$channel) {
            return false;
        }

        $this->notificationSystem->removeMailReminder($user);

        $membersRepo = $this->doctrine->getRepository("Twake\Channels:ChannelMember");
        /**
         * @var $member ChannelMember
         */
        $member = $membersRepo->findOneBy(Array("direct" => $channel->getDirect(), "channel_id" => $channel->getId(), "user_id" => $user->getId()));

        if (!$member) {
            return false;
        }

        $member->setLastMessagesIncrement($channel->getMessagesIncrement());
        $member->setLastAccess(new \DateTime());

        $array = $channel->getAsArray();
        $array["_user_last_message_increment"] = $member->getLastMessagesIncrement();
        $array["_user_last_access"] = $member->getLastAccess() ? $member->getLastAccess()->getTimestamp() : 0;
        $this->pusher->push(Array("type" => "update", "notification" => Array("channel" => $array)), "notifications/" . $user->getId());

        //Verify workspaces and groups
        if ($channel->getOriginalWorkspaceId()) {
            $this->checkReadWorkspace($channel->getOriginalWorkspaceId(), $user, false);
        } else {
            $this->countBadge($user);
        }

        $this->doctrine->persist($member);
        $this->doctrine->flush();

        return true;

    }

    public function checkReadWorkspace($workspace_id, $user, $flush = true)
    {

        if (!$workspace_id) {
            return false;
        }

        $this->notificationSystem->removeMailReminder($user);

        $workspaceUsers = $this->doctrine->getRepository("Twake\Workspaces:WorkspaceUser");
        $workspaceUser = $workspaceUsers->findOneBy(Array("workspace" => $workspace_id, "user" => $user));

        $all_read = true;
        if ($workspaceUser && $workspaceUser->getHasNotifications()) {

            $channels = $this->doctrine->getRepository("Twake\Channels:Channel")->findBy(
                Array("original_workspace_id" => $workspace_id, "direct" => false)
            );
            //TODO check also linked channels in workspace when implemented
            foreach ($channels as $_channel) {
                $link = $this->doctrine->getRepository("Twake\Channels:ChannelMember")->findOneBy(
                    Array("direct" => false, "channel_id" => $_channel->getId(), "user_id" => $user->getId())
                );
                if ($link && $link->getLastMessagesIncrement() < $_channel->getMessagesIncrement()) {
                    $all_read = false;
                    break;
                }
            }
        }

        if ($all_read) {
            //Mark workspace as read
            if ($workspaceUser && $workspaceUser->getHasNotifications()) {
                $workspaceUser->setHasNotifications(false);
                $this->doctrine->persist($workspaceUser);
                $this->pusher->push(Array("type" => "update", "notification" => Array("workspace_id" => $workspace_id, "hasnotifications" => false)), "notifications/" . $user->getId());
            }

            $groupId = $workspaceUser->getWorkspace()->getGroup()->getId();

            $groupUsers = $this->doctrine->getRepository("Twake\Workspaces:GroupUser");
            $groupUser = $groupUsers->findOneBy(Array("group" => $groupId, "user" => $user));

            $all_read = true;

            if ($groupUser && $groupUser->getHasNotifications()) {
                $workspacesUser = $workspaceUsers->findBy(Array("user" => $user));

                foreach ($workspacesUser as $workspaceUser) {
                    if ($workspaceUser->getHasNotifications()) {
                        $workspace = $workspaceUser->getWorkspace();
                        if ($workspace->getGroup()->getId() == $groupId) {
                            $all_read = false;
                            break;
                        }
                    }
                }
            }

            if ($all_read) {
                if ($groupUser && $groupUser->getHasNotifications()) {
                    $groupUser->setHasNotifications(false);
                    $this->doctrine->persist($groupUser);
                    $this->pusher->push(Array("type" => "update", "notification" => Array("group_id" => $groupId, "hasnotifications" => false)), "notifications/" . $user->getId());
                }

                //Test if all workspaces are readed
                $this->countBadge($user);


            }

        }

        if ($flush) {
            $this->doctrine->flush();
        }

        return true;

    }

    public function countBadge($user)
    {
        $workspaceUsers = $this->doctrine->getRepository("Twake\Workspaces:WorkspaceUser");

        $all_read = true;
        $workspacesUser = $workspaceUsers->findBy(Array("user" => $user));
        foreach ($workspacesUser as $workspaceUser) {
            if ($workspaceUser->getHasNotifications()) {
                $all_read = false;
                break;
            }
        }
        if ($all_read) {
            $this->notificationSystem->updateDeviceBadge($user, 0);
        }

    }

    public function mute($channel, $state, $user)
    {

        if (is_string($channel)) {
            $channel = $this->doctrine->getRepository("Twake\Channels:Channel")->findOneBy(Array("id" => $channel));
        }

        if (!$channel) {
            return false;
        }

        $membersRepo = $this->doctrine->getRepository("Twake\Channels:ChannelMember");
        $member = $membersRepo->findOneBy(Array("direct" => $channel->getDirect(), "channel_id" => $channel->getId(), "user_id" => $user->getId()));

        $member->setMuted($state);
        $this->doctrine->flush();

        return true;

    }

}

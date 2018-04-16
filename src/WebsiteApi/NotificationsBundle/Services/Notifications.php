<?php


namespace WebsiteApi\NotificationsBundle\Services;
use RMS\PushNotificationsBundle\Message\iOSMessage;
use WebsiteApi\NotificationsBundle\Entity\Notification;
use WebsiteApi\NotificationsBundle\Model\NotificationsInterface;

/**
 * Class Notifications
 * @package WebsiteApi\UsersBundle\Services
 *
 * Gestion des notifications
 */
class Notifications implements NotificationsInterface
{

	var $doctrine;

	public function __construct($doctrine, $pusher, $mailer, $krlove_async, $fcm_pusher, $rms_push_notifications){
		$this->doctrine = $doctrine;
		$this->pusher = $pusher;
		$this->mailer = $mailer;
		$this->krlove_async = $krlove_async;
		$this->fcm_pusher = $fcm_pusher;
		$this->rms_push_notifications = $rms_push_notifications;
	}

	public function pushNotification($application = null, $workspace = null, $users = null, $levels = null, $code = null, $text = null, $type = Array(), $data = null)
	{
        return $this->krlove_async->call(
            'app.notifications',
            'pushNotificationAsync',
            Array($application, $workspace, $users, $levels, $code, $text, $type, $data));
	}

	public function pushNotificationAsync($application = null, $workspace = null, $users = null, $levels = null, $code = null, $text = null, $type = Array(), $data=null)
	{

		if($workspace != null){
            $workspace = $this->doctrine->getRepository("TwakeWorkspacesBundle:Workspace")->find($workspace);
        }

		if($application != null) {
			$application = $this->doctrine->getRepository("TwakeMarketBundle:Application")->find($application);
		}

		$title = "";
		if ($workspace && $workspace->getGroup()) {
			$title .= $workspace->getGroup()->getDisplayName() . " - ";
			$title .= $workspace->getName() . " : ";
		} else {
			$title .= "Private : ";
		}
		if($application){
			$title .= $application->getName();
		}


		$data = Array(
			"type"=>"add",
			"workspace_id"=>($workspace!=null?$workspace->getId():null),
			"app_id"=>($application!=null?$application->getId():null),
			"title" => $title,
			"text" => $text,
			"code" => $code,
			"type" => $type
		);

        $count = count($users);
        for($i = 0; $i < $count; $i++) {

			$user = $this->doctrine->getRepository("TwakeUsersBundle:User")->find($users[$i]);

			//Verify that user want this notification

			$notificationPreference = $user->getNotificationPreference();
			$useDevices = false;
			if($notificationPreference["devices"]==0){
				$useDevices = true;
			}
			if($notificationPreference["devices"]==1 && !$user->isConnected()){
				$useDevices = true;
			}
			if($useDevices) {
				$currentDate = gmdate("H") + floor(gmdate("i") / 30) / 2;
				if ($notificationPreference["dont_disturb_between"] != null && $notificationPreference["dont_disturb_and"] != null) {

					if ($notificationPreference["dont_disturb_between"] < $notificationPreference["dont_disturb_and"]
						&& $currentDate >= $notificationPreference["dont_disturb_between"]
						&& $currentDate < $notificationPreference["dont_disturb_and"]
					) {
						$useDevices = false;
					}
					if ($notificationPreference["dont_disturb_between"] > $notificationPreference["dont_disturb_and"]
						&& ($currentDate >= $notificationPreference["dont_disturb_between"]
							|| $currentDate < $notificationPreference["dont_disturb_and"])
					) {
						$useDevices = false;
					}

				}
			}
			if(!$notificationPreference["dont_use_keywords"]){
				$keywords = explode(",",$notificationPreference["keywords"]);
				$keywords[] = $user->getUsername();
				$present = false;
				foreach($keywords as $keyword){
					$keyword = trim($keyword);
					$keyword = " ".$keyword." ";
					if(strrpos(strtolower($title." ".$text." "), strtolower($keyword))>=0) {
						$present = true;
					}
				}
				if(!$present){
					continue;
				}
			}
			if($notificationPreference["privacy"]){
				$data["text"] = "[Private]";
			}

			$n = new Notification($application, $workspace, $user);
			if($data){
				$n->setData($data);
			}
			if($code){
				$n->setCode($code);
			}
			if($text){
				$n->setText($text);
			}
			if($title){
				$n->setTitle($title);
			}
			$this->doctrine->persist($n);

			if(in_array("push", $type)){
				$totalNotifications = $this->countAll($user) + 1;
				if($useDevices) {
					@$this->pushDevice($user, $data["text"], $title, $totalNotifications, $data);
				}else{
					@$this->updateDeviceBadge($user, $totalNotifications);
				}
			}
			if(in_array("mail", $type)){
				@$this->sendMail($application, $workspace, $user, $text);
			}

			$data["action"] = "add";
			$this->pusher->push($data, "notifications_topic", Array("id_user" => $user->getId()));

            gc_collect_cycles();

		}

		$this->doctrine->flush();

        gc_collect_cycles();

        posix_kill(getmypid(), 9);

    }

	public function readAll($application, $workspace, $user, $code = null)
	{
		$this->krlove_async->call(
			'app.notifications',
			'readAllAsync',
			Array($application, $workspace, $user, $code));
	}

	public function readAllAsync($application, $workspace, $user, $code = null)
	{

		$nRepo = $this->doctrine->getRepository("TwakeNotificationsBundle:Notification");
		if(!$code){
			$notif = $nRepo->findBy(Array(
				"workspace"=>$workspace,
				"application"=>$application,
				"user"=>$user
			));
		}else{
			$notif = $nRepo->findBy(Array(
				"workspace"=>$workspace,
				"application"=>$application,
				"user"=>$user,
				"code"=>$code
			));
		}

        $count = count($notif);
        for($i = 0; $i < $count; $i++) {
			$this->doctrine->remove($notif[$i]);
            gc_collect_cycles();
		}
		$this->doctrine->flush();

		$totalNotifications = $this->countAll($user);

		$data = Array(
			"action"=>"remove",
			"workspace_id"=>($workspace)?$workspace->getId():null,
			"app_id"=>($application)?$application->getId():null
		);
		$this->pusher->push($data, "notifications_topic", Array("id_user" => $user->getId()));

		$this->updateDeviceBadge($user, $totalNotifications);

        gc_collect_cycles();

        posix_kill(getmypid(), 9);

    }

	public function countAll($user)
	{
		$qb = $this->doctrine->createQueryBuilder();
		$qb = $qb->select('count(n.id)')
			->where('n.user = :user')
			->setParameter('user', $user)
			->from('TwakeNotificationsBundle:Notification','n');

		return $qb->getQuery()->getSingleScalarResult();
	}

	public function getAll($user)
	{
		$nRepo = $this->doctrine->getRepository("TwakeNotificationsBundle:Notification");
		$notifs = $nRepo->findBy(Array("user"=>$user));

		return $notifs;
	}


	/* Private */
	private function updateDeviceBadge($user, $badge=0){
		$devicesRepo = $this->doctrine->getRepository("TwakeUsersBundle:Device");
		$devices = $devicesRepo->findBy(Array("user"=>$user));

        $count = count($devices);
        for($i = 0; $i < $count; $i++) {
            $device = $devices[$i];
			if($device->getType()=="APNS"){

				$token = $device->getValue();

				$message = new iOSMessage();
				$message->setAPSBadge($badge);
				$message->setDeviceIdentifier($token);

				$this->rms_push_notifications->send($message);

			}
			if($device->getType()=="GCM"){

				//For now no number

			}
            gc_collect_cycles();
		}
	}

	private function pushDevice($user, $text, $title, $badge=null, $data=null){

		$devicesRepo = $this->doctrine->getRepository("TwakeUsersBundle:Device");
		$devices = $devicesRepo->findBy(Array("user"=>$user));

        $count = count($devices);
        for($i = 0; $i < $count; $i++) {
            $device = $devices[$i];
			if($device->getType()=="APNS"){

				$token = $device->getValue();

				$data = array(
					"title"=>substr($title, 0, 50),
					"body"=>substr($text, 0, 100)
				);

				$message = new iOSMessage();
				$message->setMessage($data);
				if($badge) {
					$message->setAPSBadge($badge);
				}
				$message->setAPSSound("default");
				$message->setDeviceIdentifier($token);

				$this->rms_push_notifications->send($message);

			}
			if($device->getType()=="FCM"){

				$token = $device->getValue();

				$notification = $this->fcm_pusher->createDeviceNotification(
					substr($title, 0, 50),
					substr($text, 0, 100),
					$token
			    );
				$notification->setSound("default");
				$notification->setPriority('high');
				$this->fcm_pusher->sendNotification($notification);

			}
            gc_collect_cycles();
		}
	}

	private function sendMail($application, $workspace, $user, $text){
		$this->mailer->send($user->getEmail(), "notification", Array(
			"application_name"=>($application)?$application->getName():"Twake",
			"workspace_name"=>($workspace)?$workspace->getName():"Account",
			"username"=>$user->getUsername(),
			"text"=>$text
		));
	}
}

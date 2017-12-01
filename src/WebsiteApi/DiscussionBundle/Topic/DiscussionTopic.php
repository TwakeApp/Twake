<?php
namespace WebsiteApi\DiscussionBundle\Topic;

use Gos\Bundle\WebSocketBundle\Topic\TopicInterface;
use WebsiteApi\DiscussionBundle\Services\Messages;
use WebsiteApi\UsersBundle\Entity\User;
use Ratchet\ConnectionInterface;
use Ratchet\Wamp\Topic;
use Gos\Bundle\WebSocketBundle\Router\WampRequest;
use Gos\Bundle\WebSocketBundle\Topic\PushableTopicInterface;

class DiscussionTopic implements TopicInterface, PushableTopicInterface
{

	public function getName()
	{
		return 'discussion.topic';
	}

	private $messagesService;
	private $clientManipulator;
	private $doctrine;
	private $notif;

	public function __construct($messagesService, $clientManipulator, $doctrine, $notif)
	{
		$this->messagesService = $messagesService;
		$this->clientManipulator = $clientManipulator;
		$this->doctrine = $doctrine;
		$this->notif = $notif;
	}


	//Post d'un message
	public function onPublish(ConnectionInterface $connection, Topic $topic, WampRequest $request, $event, array $exclude, array $eligible)
	{

		$operation = $event['type'];

		$key = $request->getAttributes()->get('key');
		$id = $key;
		$type = "channel";

		$currentUser = $this->clientManipulator->getClient($connection);

		if (!($currentUser instanceof User)) {
			return;
		}

		if (count(explode("_", $key)) == 2) {

			$type = "user";

			//On récupère l'id de l'autre utilisateur
			$ids = explode("_", $key);
			if (count($ids) < 2) {
				return;
			}
			if ($ids[0] == $currentUser->getId()) {
				$id = intval($ids[1]);
			} else {
				$id = intval($ids[0]);
			}
		}

		//Verify user is logged in
		if ($currentUser == null
			|| is_string($currentUser)
		) {

			return; //Cancel operation

		}

		$currentUser = $this->doctrine->getRepository("TwakeUsersBundle:User")->findOneById($currentUser->getId());

		//Verify that this user is allowed to do this
		if ($this->messagesService->isAllowed($currentUser, $type, $id)) {

			//We can speak

			//Ask for an initialization
			if ($operation == 'I') {

				$this->messagesService->getInit($currentUser, $type, $id, $topic);

			} //Send message
			elseif ($operation == 'M') {
				if (isset($event['data']) && isset($event['data']['content'])) {
					$this->messagesService->sendMessage($currentUser, $type, $id, $event['data']['content'], $topic);
				}
			} elseif ($operation == 'U') {
				if (isset($event['data'])) {
					$this->messagesService->sendMessageUpload($currentUser, $type, $id, $event['data']['idFile'], $event['data']['fileIsInDrive'], $topic);
				}
			} //Edit message
			elseif ($operation == 'E') {

				if (isset($event['data']) && isset($event['data']['id'])
					&& isset($event['data']['content'])
				) {

					$messageId = $event['data']['id'];
					$content = $event['data']['content'];

					// Modification du message et envoi au channel
					$this->messagesService->editMessage($currentUser, $type, $id, $messageId, $content, $topic);
				}

			} //Delete message
			elseif ($operation == 'D') {
				if (isset($event['data']) && isset($event['data']['id'])) {
					$this->messagesService->deleteMessage($currentUser, $type, $id, $event['data']['id'], $topic);
				}

			} //Like message
			elseif ($operation == 'L') {
				if (isset($event['data']) && isset($event['data']['id'])) {
					$this->messagesService->likeMessage($currentUser, $type, $id, $event['data']['id'], $event['data']['type'], $topic);
				}

			} //Writing...
			elseif ($operation == 'W') {
				if (isset($event['data']) && isset($event['data']['event'])) {
					$topic->broadcast(Array(
						'type' => 'W',
						'data' => Array(
							"event" => $event['data']['event'],
							"id" => $currentUser->getId()
						)
					));
				}
			} //Pinned messages
			else if ($operation == 'P') {

				if (isset($event['data']) && isset($event['data']['id']) && isset($event['data']['pinned'])) {

					$messageId = $event['data']['id'];
					$pinned = $event['data']['pinned'];

					// Modification du message et envoi au channel
					$this->messagesService->pinMessage($currentUser, $type, $id, $messageId, $pinned, $topic);
				}
			}

		} else {
			$topic->remove($connection); //Eject the hacker !
		}

	}

	/* Push from server */
	public function onPush(Topic $topic, WampRequest $request, $data, $provider)
	{

		$operation = $data['type'];

		// Remove file from drive
		if ($operation == 'R') {
			$this->messagesService->removeFileFromDrive($data['data']['fileId']);
		} else {
			$topic->broadcast($data);
		}
	}


	public function onSubscribe(ConnectionInterface $connection, Topic $topic, WampRequest $request)
	{
		$key = $request->getAttributes()->get('key');

		$currentUser = $this->clientManipulator->getClient($connection);

		if (!($currentUser instanceof User)) {
			return;
		}

		//Verify user is logged in
		if ($currentUser == null
			|| is_string($currentUser)
		) {

			return; //Cancel operation
		}

		$currentUser = $this->doctrine->getRepository("TwakeUsersBundle:User")->findOneById($currentUser->getId());

		//Verify that this user is allowed to do this
		if (!$this->messagesService->isAllowedByKey($currentUser, $key)) {
			$topic->remove($connection); //Eject the hacker !
		}

	}

	public function onUnSubscribe(ConnectionInterface $connection, Topic $topic, WampRequest $request)
	{
		$currentUser = $this->clientManipulator->getClient($connection);
		$route = $request->getAttributes()->get('key');
		$from = null;
		if (!($currentUser instanceof User)) {
			return;
		}

		if (count(explode("_", $route)) == 2) {

			$route = "private_message";

			//On récupère l'id de l'autre utilisateur
			$ids = explode("_", $route);
			if (count($ids) < 2) {
				return;
			}
			if ($ids[0] == $currentUser->getId()) {
				$from = intval($ids[1]);
			} else {
				$from = intval($ids[0]);
			}
		} else {
			$route = "group_message_ch" . $route;
		}

		if ($this->notif != null) {
			$this->notif->read($currentUser, $from, $route);
		}
	}

}


?>

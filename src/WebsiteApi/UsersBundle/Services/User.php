<?php

namespace WebsiteApi\UsersBundle\Services;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Http\Event\InteractiveLoginEvent;
use WebsiteApi\UsersBundle\Entity\Device;
use WebsiteApi\UsersBundle\Entity\VerificationNumberMail;
use WebsiteApi\UsersBundle\Model\UserInterface;

/**
 * This service is responsible for subscribtions, unsubscribtions, request for new password
 */
class User implements UserInterface
{

	private $em;
	private $encoder_factory;
	private $authorization_checker;
	private $core_remember_me_manager;
	private $event_dispatcher;
	private $request_stack;
	private $user_stats;
	private $twake_mailer;
	private $string_cleaner;
	private $token_storage;

	public function __construct($em, $encoder_factory, $authorization_checker, $token_storage, $core_remember_me_manager, $event_dispatcher, $request_stack, $user_stats, $twake_mailer, $string_cleaner){
		$this->em = $em;
		$this->encoder_factory = $encoder_factory;
		$this->core_remember_me_manager = $core_remember_me_manager;
		$this->event_dispatcher = $event_dispatcher;
		$this->request_stack = $request_stack;
		$this->user_stats = $user_stats;
		$this->twake_mailer = $twake_mailer;
		$this->string_cleaner = $string_cleaner;
		$this->authorization_checker = $authorization_checker;
		$this->token_storage= $token_storage;
	}

	public function current()
	{
		$securityContext = $this->authorization_checker;

		if ($securityContext->isGranted('IS_AUTHENTICATED_REMEMBERED')) {
			return true;
		}

		return false;
	}

	public function login($usernameOrMail, $password, $rememberMe = false, $request = null, $response = null)
	{

		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");

		$user = $userRepository->findOneBy(Array("username"=>$this->string_cleaner->simplifyUsername($usernameOrMail)));
		if($user==null){
			$user = $userRepository->findOneBy(Array("email"=>$this->string_cleaner->simplifyMail($usernameOrMail)));
		}

		if($user==null){
			return false;
		}

		$passwordValid = $this->encoder_factory
			->getEncoder($user)
			->isPasswordValid($user->getPassword(), $password, $user->getSalt());

		if($passwordValid && !$user->getBanned()){

			// User log in
			$token = new UsernamePasswordToken($user, null, "main", $user->getRoles());
			if($rememberMe){
				$this->core_remember_me_manager->doRemember($request, $response, $token);
			}
			$this->token_storage->setToken($token);

			$request = $this->request_stack->getCurrentRequest();
			$event = new InteractiveLoginEvent($request, $token);
			$this->event_dispatcher->dispatch("security.interactive_login", $event);

			// User stats trigger log in
			$this->user_stats->login($user->getId());

			return $user;

		}

		return false;

	}

	public function logout()
	{
		$response = new Response();
		$response->headers->clearCookie('REMEMBERME');
		$response->sendHeaders();

		(new Session())->invalidate();

		return true;
	}

	public function ban($userId)
	{
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->find($userId);
		$user->setBanned(true);
		$this->em->persist($user);
		$this->em->flush();
	}

	public function unban($userId)
	{
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->find($userId);
		$user->setBanned(false);
		$this->em->persist($user);
		$this->em->flush();
	}

	public function delete($userId)
	{
		// TODO: Implement delete() method.
		$this->ban($userId); //To replace with a real delete
	}

	public function unsubscribe($userId, $reason)
	{
		// TODO: Implement unsubscribe() method.
	}

	public function cancelUnsubscribe($userId)
	{
		// TODO: Implement cancelUnsubscribe() method.
	}

	public function checkUnsubscribedUsers()
	{
		// TODO: Implement checkUnsubscribedUsers() method.
	}

	public function requestNewPassword($mail)
	{

		$mail = $this->string_cleaner->simplifyMail($mail);

		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->findOneBy(Array("email"=>$mail));

		if($user != null) {
			$verificationNumberMail = new VerificationNumberMail($mail);

			$code = $verificationNumberMail->getCode();

			$this->twake_mailer->send($mail, "requestPassword", Array("code"=>$code, "username"=>$user->getUsername()));

			$this->em->persist($verificationNumberMail);
			$this->em->flush();
			return $verificationNumberMail->getToken();
		}

		return false;
	}

	public function checkNumberForNewPasswordRequest($token, $code)
	{
		$verificationRepository = $this->em->getRepository("TwakeUsersBundle:VerificationNumberMail");
		$ticket = $verificationRepository->findOneBy(Array("token"=>$token));

		if($ticket != null) {
			return $ticket->verifyCode($code);
		}

		return false;
	}

	public function setNewPasswordAfterNewPasswordRequest($token, $code, $password)
	{

		$verificationRepository = $this->em->getRepository("TwakeUsersBundle:VerificationNumberMail");
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$ticket = $verificationRepository->findOneBy(Array("token"=>$token));
		$factory = $this->encoder_factory;

		if($ticket != null) {
			if($ticket->verifyCode($code)){
				$user = $userRepository->findOneBy(Array("email"=>$ticket->getMail()));
				if($user != null){

					$encoder = $factory->getEncoder($user);
					$user->setPassword($encoder->encodePassword($password, $user->getSalt()));

					$this->em->remove($ticket);
					$this->em->persist($user);
					$this->em->flush();

					return true;
				}
			}
		}

		return false;
	}

	public function subscribeMail($mail)
	{

		$mail = $this->string_cleaner->simplifyMail($mail);

		//Check mail doesn't exists
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->findOneBy(Array("email"=>$mail));
		if($user != null){
			return false;
		}
		$mailsRepository = $this->em->getRepository("TwakeUsersBundle:Mail");
		$mail = $mailsRepository->findOneBy(Array("mail"=>$mail));
		if($mail != null){
			return false;
		}

		$verificationNumberMail = new VerificationNumberMail($mail);
		$code = $verificationNumberMail->getCode();

		$this->twake_mailer->send($mail, "subscribeMail", Array("code"=>$code));

		$this->em->persist($verificationNumberMail);
		$this->em->flush();
		return $verificationNumberMail->getToken();
	}

	public function checkNumberForSubscribe($token, $code)
	{
		$verificationRepository = $this->em->getRepository("TwakeUsersBundle:VerificationNumberMail");
		$ticket = $verificationRepository->findOneBy(Array("token"=>$token));

		if($ticket != null) {
			return $ticket->verifyCode($code);
		}

		return false;
	}

	public function subscribe($token, $code, $pseudo, $password)
	{

		if(!$this->string_cleaner->verifyPassword($password))
		{
			return false;
		}

		$pseudo = $this->string_cleaner->simplifyUsername($pseudo);

		//Check pseudo doesn't exists
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->findOneBy(Array("username"=>$pseudo));
		if($user != null){
			return false;
		}

		$verificationRepository = $this->em->getRepository("TwakeUsersBundle:VerificationNumberMail");
		$ticket = $verificationRepository->findOneBy(Array("token"=>$token));
		$factory = $this->encoder_factory;

		if($ticket != null) {
			if($ticket->verifyCode($code)){

				$mail = $ticket->getMail();

				$user = new \WebsiteApi\UsersBundle\Entity\User();
				$encoder = $factory->getEncoder($user);
				$user->setPassword($encoder->encodePassword($password, $user->getSalt()));
				$user->setUsername($pseudo);
				$user->setEmail($mail);

				$this->twake_mailer->send($mail, "newMember", Array("username"=>$user->getUsername()));

				$this->em->remove($ticket);
				$this->em->persist($user);
				$this->em->flush();

				return $user;

			}
		}

		return false;
	}

	public function checkPassword($userId, $password)
	{
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");

		$user = $userRepository->find($userId);

		if($user==null){
			return false;
		}

		$passwordValid = $this->encoder_factory
			->getEncoder($user)
			->isPasswordValid($user->getPassword(), $password, $user->getSalt());

		if($passwordValid){
			return true;
		}

		return false;
	}

	public function addDevice($userId, $type, $value)
	{
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$devicesRepository = $this->em->getRepository("TwakeUsersBundle:Device");
		$user = $userRepository->find($userId);

		if($user != null) {
			$device = $devicesRepository->findOneBy(Array("type"=>$type, "value"=>$value));
			$this->em->remove($device);

			$newDevice = new Device($user, $type, $value);
			$this->em->persist($newDevice);
			$this->em->flush();

			return true;
		}

		return false;
	}

	public function removeDevice($userId, $type, $value)
	{
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$devicesRepository = $this->em->getRepository("TwakeUsersBundle:Device");
		$user = $userRepository->find($userId);

		if($user != null) {
			$device = $devicesRepository->findOneBy(Array("user"=>$user, "type"=>$type, "value"=>$value));
			$this->em->remove($device);
			$this->em->flush();

			return true;
		}

		return false;
	}

	public function getSecondaryMails($userId){

		$mailRepository = $this->em->getRepository("TwakeUsersBundle:Mail");
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->find($userId);

		return $mailRepository->findBy(Array("user" => $user));

	}

	public function addNewMail($userId, $mail)
	{

		$mail = $this->string_cleaner->simplifyMail($mail);

		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$mailRepository = $this->em->getRepository("TwakeUsersBundle:Mail");
		$user = $userRepository->find($userId);

		if($user != null) {
			$mailExists = $mailRepository->findOneBy(Array("user"=>$user, "mail"=>$mail));

			if($mailExists == null) {

				$verificationNumberMail = new VerificationNumberMail($mail);

				$code = $verificationNumberMail->getCode();

				$this->twake_mailer->send($mail, "addMail",
					Array("code"=>$code, "username"=>$user->getUsername()));

				$this->em->persist($verificationNumberMail);
				$this->em->flush();
				return $verificationNumberMail->getToken();

			}

			return true;
		}

		return false;
	}

	public function removeSecondaryMail($userId, $mail)
	{

		$mail = $this->string_cleaner->simplifyMail($mail);

		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$mailRepository = $this->em->getRepository("TwakeUsersBundle:Mail");
		$user = $userRepository->find($userId);

		if($user != null) {
			$mail = $mailRepository->findOneBy(Array("user"=>$user, "mail"=>$mail));
			$this->em->remove($mail);
			$this->em->flush();

			return true;
		}

		return false;
	}

	public function checkNumberForAddNewMail($token, $code)
	{

		$verificationRepository = $this->em->getRepository("TwakeUsersBundle:VerificationNumberMail");
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$ticket = $verificationRepository->findOneBy(Array("token"=>$token));

		if($ticket != null) {
			if($ticket->verifyCode($code)){
				$user = $userRepository->findOneBy(Array("email"=>$ticket->getMail()));
				if($user != null){

					$mail = new Mail();
					$mail->setMail($ticket->getMail());
					$mail->setUser($user);

					$this->em->remove($ticket);
					$this->em->persist($mail);
					$this->em->flush();

					return true;
				}
			}
		}

		return false;
	}

	public function changePassword($userId, $oldPassword, $password)
	{

		if(!$this->string_cleaner->verifyPassword($password))
		{
			return false;
		}

		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->find($userId);
		$factory = $this->encoder_factory;
		if($user != null){

			$passwordValid = $factory
				->getEncoder($user)
				->isPasswordValid($user->getPassword(), $oldPassword, $user->getSalt());

			if($passwordValid) {

				$encoder = $factory->getEncoder($user);
				$user->setPassword($encoder->encodePassword($password, $user->getSalt()));

				$this->em->persist($user);
				$this->em->flush();

				return true;
			}

		}

		return false;
	}

	public function changePseudo($userId, $pseudo)
	{

		$pseudo = $this->string_cleaner->simplifyUsername($pseudo);

		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$user = $userRepository->find($userId);

		$otherUser = $userRepository->findOneBy(Array("username"=>$pseudo));
		if($otherUser != null && $otherUser->getId()!=$userId){
			return false;
		}

		if($user != null){

			$user->setUsername($pseudo);

			$this->em->persist($user);
			$this->em->flush();

			return true;

		}

		return false;
	}

	/**
	 * @param $userId
	 * @param $mail
	 * @return bool
	 */
	public function changeMainMail($userId, $mail)
	{

		$mail = $this->string_cleaner->simplifyMail($mail);

		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");
		$mailRepository = $this->em->getRepository("TwakeUsersBundle:Mail");

		$user = $userRepository->find($userId);

		if($user != null){

			$mailObj = $mailRepository->findOneBy(Array("user"=>$user, "mail"=>$mail));

			if($mailObj != null){

				$mailObj->setMail($user->getEmail());
				$user->setEmail($mail);

				$this->em->persist($user);
				$this->em->persist($mailObj);
				$this->em->flush();

				return true;

			}

		}

		return false;
	}

	public function updateUserBasicData($userId, $firstName, $lastName, $thumbnail=null)
	{
		$userRepository = $this->em->getRepository("TwakeUsersBundle:User");

		$user = $userRepository->find($userId);

		if($user != null){

			$user->setFirstName($firstName);
			$user->setLastName($lastName);
			if($thumbnail!=null) {
				$user->setThumbnail($thumbnail);
			}
			$this->em->persist($user);
			$this->em->flush();

		}



	}

}
<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Twake\Core\Services\DoctrineAdapter;

use App\App;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Twake\Core\Entity\Sessions;
use Twake\Users\Entity\User;

class CassandraSessionHandler
{

    private $app;
    private $doctrineAdapter;

    public function __construct(App $app)
    {

        $this->app = $app;
        $this->doctrineAdapter = $app->getServices()->get("app.twake_doctrine");
        $this->didInit = false;
        $this->lifetime = 3600;
        $this->rememberMeLifetime = 60 * 60 * 24 * 360;

    }

    public function saveLoginToCookie(User $user, $remember_me, Response $response, $old_session_id = null)
    {

        if ($old_session_id) {
            $this->destroy($old_session_id);
        }

        $session_id = base64_encode(random_bytes(64));
        $user_id = $user->getId() . "";

        $expiration = date("U") + $this->lifetime;

        $data = ["userid" => $user_id, "expiration" => $expiration];

        $this->write($session_id, $data);
        $response->headers->setCookie(new Cookie('SESSID', base64_encode(json_encode(["sessid" => $session_id, "userid" => $user_id])), $expiration, '/'));

        if ($remember_me) {

            $secret = $user->getRememberMeSecret();

            if (!$secret) {
                $secret = base64_encode(random_bytes(64));
                $user->setRememberMeSecret($secret);
                $this->doctrineAdapter->persist($user);
                $this->doctrineAdapter->flush();
            }

            $remember_me_data_expiration = date("U") + $this->rememberMeLifetime;

            $remember_me_data = [
                "expiration" => $remember_me_data_expiration,
                "user_id" => $user->getId() . ""
            ];

            $nonceSize = openssl_cipher_iv_length('aes-256-ctr');
            $nonce = openssl_random_pseudo_bytes($nonceSize);
            $remember_me_data = $nonce . openssl_encrypt(json_encode($remember_me_data), 'aes-256-ctr', $secret, OPENSSL_RAW_DATA,
                    $nonce);

            $remember_me_data = [
                "remember_me" => $remember_me_data,
                "user_id" => $user->getId() . ""
            ];

            $remember_me_data = base64_encode(json_encode($remember_me_data));
            $response->headers->setCookie(new Cookie('REMEMBERME', $remember_me_data, $remember_me_data_expiration, '/'));

        }

    }

    public function checkRequest(Request $request, Response $response)
    {
        $cookie = $request->cookies->get('SESSID');
        $cookie = json_decode(base64_decode($cookie), 1);
        $session_id = $cookie["sessid"];
        $expected_user_id = $cookie["userid"];

        $remember_me = false;
        $remeber_me_cookie = $request->cookies->get('REMEMBERME');
        $remeber_me_cookie = json_decode(base64_decode($remeber_me_cookie), 1);
        if ($remeber_me_cookie) {
            $remember_me = true;
        }

        $data = $this->read($session_id);
        if ($data) {
            $user_id = $data["userid"];
            if ($expected_user_id === $user_id && $data["expiration"] > date("U")) {
                //Everything is fine

                $user = $this->doctrineAdapter->getRepository("Twake\Core:User")->find($user_id);

                if ($data["expiration"] < date("U") + $this->lifetime / 2) {
                    //Renew session lifetime
                    $this->saveLoginToCookie($user, $remember_me, $response, $session_id);
                }

                return $user;

            }
        }

        //Not authentified, try remember me
        if ($remeber_me_cookie) {
            $user_id = $remeber_me_cookie["user_id"];
            $encrypted_data = $remeber_me_cookie["remember_me"];
            $user = $this->doctrineAdapter->getRepository("Twake\Core:User")->find($user_id);
            if ($user) {
                $secret = $user->getRememberMeSecret();
                if ($secret) {
                    $nonceSize = openssl_cipher_iv_length('aes-256-ctr');
                    $nonce = mb_substr($encrypted_data, 0, $nonceSize, '8bit');
                    $ciphertext = mb_substr($encrypted_data, $nonceSize, null, '8bit');
                    $data = openssl_decrypt(
                        $ciphertext,
                        'aes-256-ctr',
                        $key,
                        OPENSSL_RAW_DATA,
                        $nonce
                    );
                    if ($data) {
                        $stored_expiration = $data["expiration"];
                        $stored_user_id = $data["user_id"];
                        if ($stored_expiration > date("U") && $stored_user_id == $user_id) {
                            //Remember me is valid
                            $this->saveLoginToCookie($user, true, $response);
                            return $user;
                        }
                    }
                }
            }
        }

        if ($session_id) {
            $this->destroySession($request);
        }

    }

    public function destroySession(Request $request)
    {

        $cookie = $request->cookies->get('SESSID');
        $cookie = json_decode(base64_decode($cookie), 1);
        $session_id = $cookie["sessid"];

        $this->destroy($session_id);

    }

    public function destroyRememberMe(Request $request)
    {

        $cookie = $request->cookies->get('SESSID');
        $cookie = json_decode(base64_decode($cookie), 1);
        $session_id = $cookie["sessid"];
        $user_id = $cookie["userid"];

        $this->destroy($session_id);

        $user = $this->doctrineAdapter->getRepository("Twake\Core:User")->find($user_id);
        if ($user->getRememberMeSecret()) {
            $user->setRememberMeSecret(false);
            $this->doctrineAdapter->persist($user);
            $this->doctrineAdapter->flush();
        }

    }

    public function destroy($sessionId)
    {
        $repo = $this->doctrineAdapter->getRepository("Twake\Core:Sessions");
        $result = $repo->find($sessionId);

        if ($result) {
            $this->doctrineAdapter->remove($result);
            $this->doctrineAdapter->flush();
        }
        return true;
    }

    public function write($sessionId, $data)
    {
        $session = $this->doctrineAdapter->getRepository("Twake\Core:Sessions")->find($sessionId);
        if (!$session) {
            $session = new Sessions();
        }
        $session->setSessId($sessionId);
        $session->setSessData($data);
        $session->setSessLifetime($this->lifetime);
        $session->setSessTime(date("U"));
        $this->doctrineAdapter->persist($session);
        $this->doctrineAdapter->flush();

        return true;
    }

    public function read($sessionId)
    {
        $repo = $this->doctrineAdapter->getRepository("Twake\Core:Sessions");
        $result = $repo->find($sessionId);

        if ($result) {
            $data = $result->getSessData();
            return $data;
        }
        return '';
    }

}

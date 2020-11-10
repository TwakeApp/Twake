// import AsyncStorage from '@react-native-community/async-storage';
// import SyncStorage from 'sync-storage';
// import { Platform, NativeModules } from 'react-native';
// var PushNotification = require('react-native-push-notification');
// import { MixpanelInstance } from 'react-native-mixpanel';
// const mixpanel = new MixpanelInstance(window.mixpanel_id);

import Globals from 'services/JWTStorage';
import JWTStorage from 'services/JWTStorage';

class Requests {
  request(
    type: 'post' | 'get' | 'put' | 'delete',
    route: string,
    data: string,
    callback: (result: string | any) => void,
  ) {
    JWTStorage.authenticateCall(() => {
      fetch(route, {
        credentials: 'same-origin',
        method: type,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: JWTStorage.getAutorizationHeader(),
        },
        body: type == 'post' ? data || '{}' : undefined,
      })
        .then(response => {
          response.text().then(text => {
            this.retrieveJWTToken(text);
            if (callback) {
              callback(text);
            }
          });
        })
        .catch(err => {
          if (callback) {
            callback(JSON.stringify({ errors: [err] }));
          }
        });
    });
  }

  retrieveJWTToken(rawBody: string) {
    try {
      const body = JSON.parse(rawBody);
      if (body.access_token) {
        JWTStorage.updateJWT(body.access_token);
      }
    } catch (err) {
      console.error('Error while reading jwt tokens from: ' + rawBody, err);
    }
  }
}

const requests = new Requests();
export default requests;

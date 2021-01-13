import LocalStorage from 'services/localStorage';
import LoginService from 'services/login/login';

type JWTDataType = {
  time: 0;
  expiration: number;
  refresh_expiration: number;
  value: string;
  refresh: string;
  type: 'Bearer';
};

declare global {
  interface Window {
    AuthData:any;
  }
}

class JWTStorageClass {
  private timeDelta = 5 * 60;
  private jwtData: JWTDataType = {
    time: 0,
    expiration: 0,
    refresh_expiration: 0,
    value: '',
    refresh: '',
    type: 'Bearer',
  };

  async init() {
    this.updateJWT(await LocalStorage.getItem('jwt'));
    (window as any).JWTStorage = this;
  }

  clear() {
    this.jwtData = {
      time: 0,
      expiration: 0,
      refresh_expiration: 0,
      value: '',
      refresh: '',
      type: 'Bearer',
    };
  }

  updateJWT(jwtData: JWTDataType) {
    if (!jwtData) {
      return;
    }
    LocalStorage.setItem('jwt', jwtData);
    this.jwtData = jwtData;
    this.timeDelta = new Date().getTime() / 1000 - jwtData.time;
    this.jwtData.expiration += this.timeDelta - 5 * 60; //Force reduce expiration by 5 minutes
    this.jwtData.refresh_expiration += this.timeDelta - 5 * 60; //Force reduce expiration by 5 minutes
    if (window.AuthData){ // post message for the mobile application to the channel named AuthData
      window.AuthData.postMessage(JSON.stringify({ "token": jwtData.value, "expiration": jwtData.expiration, "refresh_token": jwtData.refresh, "refresh_expiration": jwtData.refresh_expiration }));
    }
  }

  getJWT() {
    return this.jwtData.value;
  }

  getAutorizationHeader() {
    let value = this.jwtData.value;
    if (this.isAccessExpired()) {
      value = this.jwtData.refresh;
    }
    return this.jwtData.type + ' ' + value;
  }

  isAccessExpired() {
    return new Date().getTime() / 1000 - this.jwtData.expiration > 0;
  }

  isRefreshExpired() {
    return new Date().getTime() / 1000 - this.jwtData.refresh_expiration > 0;
  }

  authenticateCall(callback: () => void) {
    if (this.isAccessExpired() && LoginService.currentUserId) {
      LoginService.updateUser(callback);
    } else {
      callback();
    }
  }
}

const JWTStorage = new JWTStorageClass();
export default JWTStorage;

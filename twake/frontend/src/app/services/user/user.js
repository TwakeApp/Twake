import React from 'react';
import Login from 'services/login/login.js';
import Collections from 'services/Collections/Collections.js';
import Api from 'services/api.js';

import Globals from 'services/Globals.js';

class User {
  constructor() {
    if (Collections) {
      this.users_repository = Collections.get('users');
      Collections.updateOptions('users', { base_url: 'users', use_cache: true });
      this.waiting_async_get = {};
      this.stop_async_get = {};

      Globals.window.userService = this;
    }
  }

  getCurrentUser() {
    return Collections.get('users').find(Login.currentUserId);
  }

  getCurrentUserId() {
    return Login.currentUserId;
  }

  getFullName(user) {
    var name = user.username;
    if (user.firstname && user.firstname != '') {
      name = user.firstname;
    }
    if (user.firstname && user.firstname != '' && user.lastname && user.lastname != '') {
      name = user.firstname + ' ' + user.lastname;
    }
    if (!name) {
      return '';
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  getThumbnail(user) {
    var thumbnail = '';
    if (!user.thumbnail || user.thumbnail == '') {
      var output = 0;
      var string = user.id || '';
      for (let i = 0; i < string.length; i++) {
        output += string[i].charCodeAt(0);
      }
      var i = output % 100;
      thumbnail = (Globals.window.front_root_url || '') + '/public/identicon/' + i + '.png';
      //        Globals.window.api_root_url + '/ajax/users/current/identicon?username=' + user.username;
    } else {
      thumbnail = Globals.window.addApiUrlIfNeeded(user.thumbnail);
    }
    return thumbnail;
  }

  search(query, options, callback, noHttp, didTimeout) {
    const scope = options.scope;

    if (query == 'me') {
      query = this.getCurrentUser().username;
    }

    this.query = query;

    if (query.length == 0) {
      callback([]);
      return;
    }

    //First search with known data
    var res = [];
    Collections.get('users')
      .findBy({})
      .forEach(user => {
        if (
          (user.username + ' ' + user.firstname + ' ' + user.lastname)
            .toLocaleLowerCase()
            .indexOf(query.toLocaleLowerCase()) >= 0
        ) {
          res.push(user);
        }
        if (res.length > 30) {
          return false;
        }
      });

    callback(res);

    //Then search online
    if (noHttp || query.length < 2 || (this.old_search_query || '').startsWith(query)) {
      this.old_search_query = query;
      return;
    }
    this.old_search_query = query;

    if (this.timeout_search) {
      clearTimeout(this.timeout_search);
    }
    if (this.searching) {
      this.timeout_search = setTimeout(() => {
        this.search(query, callback, false, true);
      }, 1000);
      return;
    }

    this.searching = true;
    setTimeout(
      () => {
        Api.post(
          'users/all/search',
          {
            options: {
              scope: scope,
              name: query,
              workspace_id: options.workspace_id,
              group_id: options.group_id,
              language_preference: this.getCurrentUser().language,
            },
          },
          res => {
            this.searching = false;
            if (res.data && res.data.users) {
              res.data.users.forEach(item => {
                this.users_repository.updateObject(item[0]);
              });
              this.search(query, callback, true, true);
            }
          },
        );
      },
      didTimeout ? 0 : 1000,
    );
  }

  asyncGet(id, callback) {
    if (this.users_repository.known_objects_by_id[id]) {
      return;
    }

    if (this.waiting_async_get[id] || this.stop_async_get[id]) {
      return;
    }

    this.waiting_async_get[id] = true;
    Api.post('users/all/get', { id: id }, res => {
      this.waiting_async_get[id] = false;
      if (res.data && res.data.id) {
        this.users_repository.updateObject(res.data);
        if (callback) callback();
      } else {
        this.stop_async_get[id] = true;
      }
    });
  }
}

const user = new User();
export default user;

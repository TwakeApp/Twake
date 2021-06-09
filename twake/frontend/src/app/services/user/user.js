import React from 'react';
import Login from 'services/login/login.js';
import Collections from 'app/services/Depreciated/Collections/Collections.js';
import Api from 'services/Api';
import Globals from 'services/Globals.js';
import Languages from 'services/languages/languages.js';

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
    user = user || {};
    var name = user.username;

    if (user.deleted) {
      name = Languages.t('general.user.deleted');
    }

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
    user = user || {};
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

    if (user.deleted) {
      thumbnail = '';
    }

    return thumbnail;
  }

  search(query, options, callback, noHttp = undefined, didTimeout = undefined) {
    callback = callback || (() => {});

    query = query || '';

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
          (user.username + ' ' + user.firstname + ' ' + user.lastname + ' ' + user.email)
            .toLocaleLowerCase()
            .indexOf(query.toLocaleLowerCase()) >= 0
        ) {
          let in_scope = true;
          if (scope === 'workspace') {
            in_scope = (user.workspaces_id || []).indexOf(options.workspace_id) >= 0;
          }
          if (scope === 'group') {
            in_scope = (user.groups_id || []).indexOf(options.group_id) >= 0;
          }
          if (in_scope) {
            res.push(user);
          }
        }
        if (res.length > 30) {
          return false;
        }
      });

    callback(res);

    if (res.length > 5) {
      return;
    }

    //Then search on server
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
        this.search(query, options, callback, false, true);
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
              this.search(query, options, callback, true, true);
            }
          },
        );
      },
      didTimeout ? 0 : 1000,
    );
  }

  nextUsersGetBulk = [];

  asyncGet(id, callback = undefined) {
    if (
      this.users_repository.known_objects_by_id[id] &&
      new Date(this.users_repository.known_objects_by_id[id]?._last_modified || 0).getTime() >
        new Date().getTime() - 1000 * 60 * 60
    ) {
      return;
    }

    if (this.nextUsersGetBulk.length === 0) {
      setTimeout(() => {
        const ids = this.nextUsersGetBulk.map(e => e.id);
        const callbacks = {};
        this.nextUsersGetBulk.forEach(e => (callbacks[e.id] = e.callback));
        this.nextUsersGetBulk = [];

        Api.post('users/all/get', { id: ids }, res => {
          if (res.data) {
            res.data.forEach((user, index) => {
              if (!user || !user.id) {
                this.stop_async_get[ids[index]] = true;
              } else {
                callback && callback(user);
                this.users_repository.updateObject(user);
                callbacks[user.id] && callbacks[user.id]();
              }
            });
          }
        });
      }, 500);
    }

    if (this.nextUsersGetBulk.map(e => e.id).indexOf(id) < 0 && !this.stop_async_get[id]) {
      this.nextUsersGetBulk.push({ id, callback });
    }
  }

  // member - guest - admin - unknown
  getUserRole(user, company_id) {
    const currentUserCompany = (user?.companies || []).filter(
      item => item.company.id === company_id,
    )[0];

    return currentUserCompany?.role || 'unknown';
  }
}

const user = new User();
export default user;

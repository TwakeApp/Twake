import React, { Component } from 'react';

import Languages from 'services/languages/languages.js';
import LoginService from 'services/login/login.js';
import Emojione from 'components/Emojione/Emojione.js';
import Button from 'components/Buttons/Button.js';
import Input from 'components/Inputs/Input.js';

export default class LoginView extends Component {
  constructor() {
    super();

    this.state = {
      login: LoginService,
      i18n: Languages,
    };

    LoginService.addListener(this);
    Languages.addListener(this);
  }
  componentWillUnmount() {
    LoginService.removeListener(this);
    Languages.removeListener(this);
  }
  render() {
    return (
      <div className="center_box_container login_view skew_in_bottom">
        <div className="center_box white_box_with_shadow">
          <div className="title">
            {!((LoginService.server_infos || {}).branding || {}).name &&
              this.state.i18n.t('scenes.login.home.title')}
          </div>

          {!((LoginService.server_infos || {}).branding || {}).logo && (
            <div className="subtitle" style={{ marginBottom: 24 }}>
              {this.state.i18n.t('scenes.login.home.subtitle')} <Emojione type=":innocent:" />
            </div>
          )}

          {!!((LoginService.server_infos || {}).branding || {}).logo && (
            <img
              style={{ marginBottom: 40, marginTop: 10, width: 140 }}
              src={((LoginService.server_infos || {}).branding || {}).logo}
            />
          )}

          <Input
            id="username"
            type="text"
            className={
              'bottom-margin medium full_width ' + (this.state.login.login_error ? 'error ' : '')
            }
            placeholder={this.state.i18n.t('scenes.login.home.email')}
            onKeyDown={e => {
              if (e.keyCode == 13 && !this.state.login.login_loading) {
                LoginService.login(this.state.form_login, this.state.form_password, true);
              }
            }}
            onChange={evt => this.setState({ form_login: evt.target.value })}
          />

          <Input
            id="password"
            type="password"
            className={
              'bottom-margin medium full_width ' + (this.state.login.login_error ? 'error ' : '')
            }
            placeholder={this.state.i18n.t('scenes.login.home.password')}
            onKeyDown={e => {
              if (e.keyCode == 13 && !this.state.login.login_loading) {
                LoginService.login(this.state.form_login, this.state.form_password, true);
              }
            }}
            onChange={evt => this.setState({ form_password: evt.target.value })}
          />

          {this.state.login.login_error && (
            <div id="identification_information" className="smalltext error">
              {this.state.i18n.t('scenes.login.home.unable_to_connect')}
            </div>
          )}

          <Button
            id="login_btn"
            type="submit"
            className="medium full_width "
            style={{ marginBottom: 8 }}
            disabled={this.state.login.login_loading}
            onClick={() =>
              LoginService.login(this.state.form_login, this.state.form_password, true)
            }
          >
            {this.state.i18n.t('scenes.login.home.login_btn')}
          </Button>

          <a
            onClick={() => this.state.login.changeState('signin')}
            id="create_btn"
            className="blue_link"
          >
            {this.state.i18n.t('scenes.login.home.create_account')}
          </a>

          <a
            onClick={() => this.state.login.changeState('forgot_password')}
            id="forgot_password_btn"
            className="blue_link"
          >
            {this.state.i18n.t('scenes.login.home.lost_password')}
          </a>
        </div>
      </div>
    );
  }
}

import React from 'react';

import './Channel.scss';

import RouterService from 'app/services/RouterService';
import Emojione from 'components/Emojione/Emojione';
import Icon from 'components/Icon/Icon.js';
import MainViewService from 'app/services/AppView/MainViewService';
import { Collection } from 'app/services/CollectionsReact/Collections';
import { ChannelResource } from 'app/models/Channel';
import { Tooltip } from 'antd';

type Props = {
  collection: Collection<ChannelResource>;
  app?: any;
  name: string;
  icon: string | JSX.Element;
  id?: string;
  muted: boolean;
  favorite: boolean;
  unreadMessages: boolean;
  visibility: string; //"private" | "public" | "direct"
  directMembers?: string[];
  notifications: number;
  menu?: JSX.Element;
  showTooltip?: boolean;
};

export default (props: Props) => {
  const { channelId } = RouterService.useStateFromRoute();

  const selected = channelId === props.id;

  if (selected && props.id) {
    MainViewService.select(props.id, {
      collection: props.collection,
      app: props.app || 'messages',
    });
  }

  return (
    <Tooltip title={props.showTooltip ? props.name : false} placement="right" mouseEnterDelay={3}>
      <div
        className={'channel fade_in ' + (selected ? 'selected ' : '')}
        onClick={() =>
          props.id &&
          MainViewService.select(props.id, {
            collection: props.collection,
            app: props.app || 'messages',
          })
        }
      >
        {!props.app &&
          (props.visibility === 'public' || props.visibility === 'private') &&
          typeof props.icon === 'string' && (
            <div className="icon">
              <Emojione type={props.icon} />
            </div>
          )}
        {!props.app && props.visibility === 'direct' && typeof props.icon === 'object' && (
          <div className="direct-channel-avatars"> {props.icon}</div>
        )}
        {!!props.app && (
          <div className="icon">
            <Icon type={props.icon} />
          </div>
        )}
        <div className="text" style={{ textTransform: 'capitalize' }}>
          {props.name + ' '}
          {props.visibility === 'private' && <Icon type="lock merge-icon black-icon" />}
        </div>
        <div className="more">
          {props.muted && <Icon type="bell-slash merge-icon grey-icon" />}
          {props.notifications > 0 && (
            <div className="notification_dot">{Math.max(1, props.notifications)}</div>
          )}
          {props.menu}
        </div>
      </div>
    </Tooltip>
  );
};

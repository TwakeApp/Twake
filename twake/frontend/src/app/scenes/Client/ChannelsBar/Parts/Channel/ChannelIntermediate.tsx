import React from 'react';

import ChannelUI from './Channel';
import ChannelMenu from './ChannelMenu';

import { ChannelResource, ChannelType, ChannelMemberResource } from 'app/models/Channel';

import { Collection } from 'services/CollectionsReact/Collections';
import { getUserParts, useUsersListener } from 'app/components/Member/UserParts';
import { NotificationResource } from 'app/models/Notification';

type Props = {
  channel: ChannelType;
  collection: Collection<ChannelResource>;
};

export default (props: Props): JSX.Element => {
  const isDirectChannel = props.channel.visibility === 'direct';

  const menu = (channel: ChannelResource) => {
    if (!channel) return <></>;
    return <ChannelMenu channel={channel} />;
  };

  const channel = props.collection.useWatcher(
    { id: props.channel.id },
    { query: { mine: true } },
  )[0];

  useUsersListener(
    isDirectChannel ? props.channel.direct_channel_members || props.channel.members || [] : [],
  );

  const notificationsCollection = Collection.get('/notifications/v1/badges', NotificationResource, {
    queryParameters: { company_id: props.channel.company_id },
  });
  const notification = notificationsCollection.useWatcher({ channel_id: props.channel.id });

  const { avatar, name } = isDirectChannel
    ? getUserParts({
        usersIds: props.channel.direct_channel_members || props.channel.members || [],
      })
    : { avatar: '', name: '' };

  if (!channel || !channel.data.user_member?.user_id || !channel.state.persisted) return <></>;

  const channelIcon = isDirectChannel ? avatar : channel.data.icon || '';
  const channeName = isDirectChannel ? name : channel.data.name || '';

  return (
    <ChannelUI
      collection={props.collection}
      name={channeName}
      icon={channelIcon}
      muted={channel.data.user_member?.notification_level === 'none'}
      favorite={channel.data.user_member?.favorite || false}
      unreadMessages={
        (channel.data.last_activity || 0) > (channel.data.user_member.last_access || 0)
      }
      visibility={channel.data.visibility || 'public'}
      notifications={notification.length || 0}
      menu={menu(channel)}
      id={channel.data.id}
    />
  );
};

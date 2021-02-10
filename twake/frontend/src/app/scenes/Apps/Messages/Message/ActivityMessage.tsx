import { Message } from 'app/services/Apps/Messages/MessagesListServerUtils';
import React from 'react';
import Languages from 'services/languages/languages.js';
import { Row, Typography } from 'antd';
import Emojione from 'app/components/Emojione/Emojione';
import User from 'app/components/Twacode/blocks/User';
import { ChannelMemberType, ChannelType } from 'app/models/Channel';
import { TabType } from 'app/models/Tab';
import WorkspacesApps from 'services/workspaces/workspaces_apps.js';

enum ChannelActivityEnum {
  CHANNEL_MEMBER_CREATED = 'channel:activity:member:created',
  CHANNEL_MEMBER_DELETED = 'channel:activity:member:deleted',
  CHANNEL_UPDATED = 'channel:activity:updated',
  CHANNEL_TAB_CREATED = 'channel:activity:tab:created',
  CHANNEL_TAB_DELETED = 'channel:activity:tab:deleted',
  CHANNEL_CONNECTOR_CREATED = 'channel:activity:connector:created',
  CHANNEL_CONNECTOR_DELETED = 'channel:activity:connector:deleted',
}

type ActivityType = {
  type: ChannelActivityEnum;
  actor: {
    type: 'user';
    id: string;
  };
  context: {
    type: 'add' | 'diff' | 'remove';
    array?: {
      type: string;
      resource: ChannelMemberType | TabType;
    }[];
    previous?: {
      type: string;
      // should be a real type instead
      resource: { id: string; name: string; description: string; icon: string };
    };
    next?: {
      type: string;
      // should be a real type instead
      resource: { id: string; name: string; description: string; icon: string };
    };
  };
};

type PropsType = {
  refDom?: ((node: any) => any) | undefined;
  message: Message;
  activity: ActivityType;
};

// i18n but with react nodes as replacements
// TODO: maybe there is betters ways to do it with lodash
const translateUsingReactNode = (key: string, replacements: any[]): any[] => {
  let temp = Languages.t(
    key,
    replacements.map((_, i) => `{${i}}`),
  );
  let list: any[] = [];
  replacements.forEach((replacement, i) => {
    let split = temp.split(`{${i}}`);
    list.push(split[0]);
    list.push(replacement);
    temp = split[1];
  });
  list.push(temp);
  return list;
};

export default (props: PropsType): JSX.Element => {
  const generateTypographyName = (id: string) => <User id={id} username="Unknown" />;

  const memberJoinedOrInvited = (activity: ActivityType) => {
    if (activity.context.array) {
      const resource = activity.context.array[0]?.resource as ChannelMemberType;

      if (activity.actor.id === resource.user_id) {
        return translateUsingReactNode(
          'scenes.apps.messages.message.activity_message.a_join_the_channel',
          [
            <span style={{ marginRight: 8, lineHeight: 0 }}>
              {generateTypographyName(activity.actor.id)}
            </span>,
          ],
        );
      }

      if (activity.actor.id !== resource.user_id) {
        return translateUsingReactNode(
          'scenes.apps.messages.message.activity_message.a_added_b_to_the_channel',
          [
            <span style={{ marginRight: 8, lineHeight: 0 }}>
              {generateTypographyName(activity.actor.id)}
            </span>,
            <span style={{ margin: '0 8px', lineHeight: 0 }}>
              {generateTypographyName(resource.user_id || '')}
            </span>,
          ],
        );
      }
    }
  };

  const memberLeftOrRemoved = (activity: ActivityType) => {
    if (activity.context.array) {
      const resource = activity.context.array[0]?.resource as ChannelMemberType;
      if (activity.actor.id === resource.user_id) {
        return translateUsingReactNode(
          'scenes.apps.messages.message.activity_message.a_left_the_channel',
          [
            <span style={{ marginRight: 8, lineHeight: 0 }}>
              {generateTypographyName(activity.actor.id)}
            </span>,
          ],
        );
      }

      if (activity.actor.id !== resource.user_id) {
        return translateUsingReactNode(
          'scenes.apps.messages.message.activity_message.a_removed_b_from_the_channel',
          [
            <span style={{ marginRight: 8, lineHeight: 0 }}>
              {generateTypographyName(activity.actor.id)}
            </span>,
            <span style={{ margin: '0 8px', lineHeight: 0 }}>
              {generateTypographyName(resource.user_id || '')}
            </span>,
          ],
        );
      }
    }
  };

  const channelNameOrDescription = (activity: ActivityType) => {
    const previous = activity.context.previous;
    const next = activity.context.next;

    if (previous?.resource.name !== next?.resource.name) {
      const icon = <Emojione type={next?.resource.icon || ''} />;

      return translateUsingReactNode(
        'scenes.apps.messages.message.activity_message.a_updated_channel_name',
        [
          <span style={{ marginRight: 8, lineHeight: 0 }}>
            {generateTypographyName(activity.actor.id)}
          </span>,
          <Typography.Text strong className="small-x-margin">
            {icon} {next?.resource.name}
          </Typography.Text>,
        ],
      );
    }

    if (previous?.resource.description !== next?.resource.description) {
      return translateUsingReactNode(
        'scenes.apps.messages.message.activity_message.a_updated_channel_description',
        [
          <span style={{ marginRight: 8, lineHeight: 0 }}>
            {generateTypographyName(activity.actor.id)}
          </span>,
        ],
      );
    }
  };

  const channelTabCreatedOrDeleted = (activity: ActivityType) => {
    if (activity.context.array) {
      const resource = activity.context.array[0].resource as TabType;
      // WorkspaceApps.getApp() doesn't work
      const connector = WorkspacesApps.getApps().filter(app => app.id === resource.application_id);

      if (activity.context.type === 'add') {
        return translateUsingReactNode(
          'scenes.apps.messages.message.activity_message.a_created_channel_tab',
          [
            <span style={{ marginRight: 8, lineHeight: 0 }}>
              {generateTypographyName(activity.actor.id)}
            </span>,
            <Typography.Text strong className="small-x-margin">
              {connector[0].name}
            </Typography.Text>,
            <Typography.Text strong>{resource.name}</Typography.Text>,
          ],
        );
      }

      if (activity.context.type === 'remove') {
        return translateUsingReactNode(
          'scenes.apps.messages.message.activity_message.a_deleted_channel_tab',
          [
            <span style={{ marginRight: 8, lineHeight: 0 }}>
              {generateTypographyName(activity.actor.id)}
            </span>,
            <Typography.Text strong className="small-x-margin">
              {connector[0].name}
            </Typography.Text>,
            <Typography.Text strong>{resource.name}</Typography.Text>,
          ],
        );
      }
    }
  };

  const channelConnectorCreatedOrDeleted = (activity: ActivityType) => {
    if (activity.context.array) {
      const resource = activity.context.array[0].resource as ChannelType;
      // WorkspaceApps.getApp() doesn't work
      const connector = WorkspacesApps.getApps().filter(app =>
        resource.connectors?.includes(app.id),
      );

      if (connector.length) {
        if (activity.context.type === 'add') {
          return translateUsingReactNode(
            'scenes.apps.messages.message.activity_message.a_created_channel_connector',
            [
              <span style={{ marginRight: 8, lineHeight: 0 }}>
                {generateTypographyName(activity.actor.id)}
              </span>,
              <Typography.Text strong>{connector[0].name}</Typography.Text>,
            ],
          );
        }

        if (activity.context.type === 'remove') {
          return translateUsingReactNode(
            'scenes.apps.messages.message.activity_message.a_deleted_channel_connector',
            [
              <span style={{ marginRight: 8, lineHeight: 0 }}>
                {generateTypographyName(activity.actor.id)}
              </span>,
              <Typography.Text strong>{connector[0].name}</Typography.Text>,
            ],
          );
        }
      }
    }
  };

  const compute = () => {
    switch (props.activity?.type) {
      case ChannelActivityEnum.CHANNEL_MEMBER_CREATED:
        return memberJoinedOrInvited(props.activity);
      case ChannelActivityEnum.CHANNEL_MEMBER_DELETED:
        return memberLeftOrRemoved(props.activity);
      case ChannelActivityEnum.CHANNEL_UPDATED:
        return channelNameOrDescription(props.activity);
      case ChannelActivityEnum.CHANNEL_TAB_CREATED:
      case ChannelActivityEnum.CHANNEL_TAB_DELETED:
        return channelTabCreatedOrDeleted(props.activity);
      case ChannelActivityEnum.CHANNEL_CONNECTOR_CREATED:
      case ChannelActivityEnum.CHANNEL_CONNECTOR_DELETED:
        return channelConnectorCreatedOrDeleted(props.activity);
      default:
        return 'Channel Activity not found';
    }
  };

  return (
    <Row className="markdown" align="middle" justify="center" ref={props.refDom}>
      {compute()}
    </Row>
  );
};

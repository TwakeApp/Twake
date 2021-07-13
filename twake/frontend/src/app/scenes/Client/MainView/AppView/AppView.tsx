import React, { FC } from 'react';
import Messages from 'app/scenes/Apps/Messages';
import Drive from 'scenes/Apps/Drive/Drive.js';
import Calendar from 'scenes/Apps/Calendar/Calendar.js';
import Tasks from 'scenes/Apps/Tasks/Tasks.js';
import NoApp from '../NoApp';
import AppViewService from 'app/services/AppView/AppViewService';

type PropsType = {
  viewService: AppViewService;
  id: string;
  current_channelTab?: any;
  current_channel?: any;
};

const AppView: FC<PropsType> = props => {
  //Listen context and app_id changes
  props.viewService.useWatcher(() => {
    return [
      props.viewService.getConfiguration().app?.id,
      props.viewService.getConfiguration().context,
    ];
  });

  const configuration = props.viewService.getConfiguration();

  const channelCollection = configuration.collection;
  let channel = null;
  if (channelCollection) {
    if (channelCollection?.findOne) {
      channel = channelCollection.findOne({ id: props.id }, { withoutBackend: true });
    } else {
      channel = channelCollection.find(props.id);
      channel = {
        data: {
          workspace_id: channel.original_workspace,
          company_id: channel.original_group,
          ...channel,
        },
      };
    }
  }

  const app = props.viewService.getConfiguration().app;
  let channelTab = configuration.context;

  if (channel) {
    switch (app?.simple_name) {
      case 'twake_drive':
        return <Drive channel={channel} tab={channelTab} options={configuration} />;
      case 'twake_calendar':
        return <Calendar channel={channel} tab={channelTab} options={configuration} />;
      case 'twake_tasks':
        return <Tasks channel={channel} tab={channelTab} options={configuration} />;
      case 'messages':
        return <Messages channel={channel} options={configuration} />;
      default:
        return <NoApp />;
    }
  }
  return <></>;
};
export default AppView;

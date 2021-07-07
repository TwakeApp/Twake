import React from 'react';

import './Messages.scss';
import { ChannelResource } from 'app/models/Channel';
import Messages from './Messages';
import { ViewConfiguration } from 'app/services/AppView/AppViewService';

type Props = {
  channel: ChannelResource;
  tab?: any;
  options: ViewConfiguration;
};

/**
 * Instanciate a Messages component with a good unicity key
 */
export default (props: Props) => {
  return (
    <Messages
      channel={props.channel}
      options={props.options}
      key={`${props.options?.context?.threadId}${props.channel?.id}`}
    />
  );
};

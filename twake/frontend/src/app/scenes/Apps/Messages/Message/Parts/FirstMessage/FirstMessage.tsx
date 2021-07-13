import React from 'react';
import MessageLoaderFactory from 'app/services/Apps/Messages/MessageLoaderFactory';
import Languages from 'services/languages/languages.js';
import Collections from 'app/services/CollectionsReact/Collections';
import Emojione from 'components/Emojione/Emojione';
import { ChannelResource } from 'app/models/Channel';
import DirectChannelFirstMessage from './DirectChannelFirstMessage';
import './FirstMessage.scss';

type Props = {
  channelId: string;
  refDom?: (node: any) => any;
};

export default (props: Props) => {
  const context = MessageLoaderFactory.channelsContextById[props.channelId];
  const companyId = context.companyId;
  const workspaceId = context.workspaceId;
  const path = `/channels/v1/companies/${companyId}/workspaces/${workspaceId}/channels/::mine`;
  const channelCollection = Collections.get(path, ChannelResource);

  const channel: ChannelResource = channelCollection.useWatcher({
    id: props.channelId,
  })[0];

  if (!channel) {
    return <></>;
  }

  return (
    <div className="first_message" ref={props.refDom}>
      {channel.data.visibility === 'direct' && <DirectChannelFirstMessage channel={channel.data} />}
      {channel.data.visibility !== 'direct' && (
        <div className="content">
          <div className="icon">
            <Emojione s128 type={channel.data.icon || ''} />
          </div>
          <div className="title">{channel.data.name}</div>
          <div className="text">
            {Languages.t('scenes.apps.messages.message.types.first_channel_message_text', [
              channel.data.name,
            ])}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Divider, Input, Row } from 'antd';

import Languages from 'services/languages/languages.js';
import RouterServices from 'services/RouterService';
import { Collection } from 'services/CollectionsReact/Collections';

import Icon from 'components/Icon/Icon';
import ObjectModal from 'components/ObjectModal/ObjectModal';
import { ChannelResource } from 'app/models/Channel';
import WorkspaceChannelRow from 'app/scenes/Client/ChannelsBar/Modals/WorkspaceChannelList/WorkspaceChannelRow';
import PerfectScrollbar from 'react-perfect-scrollbar';

type AutoChannelType = {
  id: string;
  name: string;
  type: string;
  channelResource: ChannelResource;
};

export default () => {
  const { companyId, workspaceId } = RouterServices.useRouteState(({ companyId, workspaceId }) => {
    return { companyId, workspaceId };
  });

  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(100);
  const autoChannels: AutoChannelType[] = [];
  const collectionPath = `/channels/v1/companies/${companyId}/workspaces/${workspaceId}/channels/`;
  const channelsCollection = Collection.get(collectionPath, ChannelResource);
  const channels = channelsCollection.useWatcher({}, { limit: limit });

  const minePath = `/channels/v1/companies/${companyId}/workspaces/${workspaceId}/channels/::mine`;
  const mineCollection = Collection.get(minePath, ChannelResource);
  const mine = mineCollection.useWatcher({});

  channels.map((channel: ChannelResource) => {
    autoChannels.push({
      id: channel.data.id || '',
      name: channel.data.name || '',
      type: 'workspace',
      channelResource: channel,
    });
  });

  const filterMineAutoChannels = (autoChannel: AutoChannelType) => {
    return !mine.some(
      channel => autoChannel.channelResource.id === channel.id && channel.data.user_member?.user_id,
    );
  };

  return (
    <ObjectModal title={Languages.t('components.channelworkspacelist.title')} closable>
      <Row className="small-bottom-margin x-margin">
        <Input
          suffix={
            <Icon type="search" className="m-icon-small" style={{ color: 'var(--grey-dark)' }} />
          }
          placeholder={Languages.t('scenes.client.channelbar.workspacechannellist.autocomplete')}
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
          autoFocus
        />
      </Row>
      <PerfectScrollbar
        style={{ height: '240px' }}
        component="div"
        options={{ suppressScrollX: true, suppressScrollY: false }}
      >
        <div style={{ height: '240px' }}>
          {autoChannels
            .filter(filterMineAutoChannels)
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter(({ name }) => name.toUpperCase().indexOf(search.toUpperCase()) > -1)
            .map(autoChannel => {
              return (
                <div key={`${autoChannel.channelResource.key}`}>
                  <WorkspaceChannelRow channel={autoChannel.channelResource} />
                  <Divider style={{ margin: 0 }} />
                </div>
              );
            })}
          {!autoChannels.filter(({ name }) => name.toUpperCase().indexOf(search.toUpperCase()) > -1)
            .length &&
            limit < autoChannels.length + 100 &&
            setLimit(autoChannels.length + 100)}
        </div>
      </PerfectScrollbar>
    </ObjectModal>
  );
};

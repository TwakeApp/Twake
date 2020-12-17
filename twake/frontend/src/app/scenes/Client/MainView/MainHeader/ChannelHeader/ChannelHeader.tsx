import React, { useState } from 'react';
import { Button, Col, Row, Typography } from 'antd';
import Emojione from 'app/components/Emojione/Emojione';
import { startCase } from 'lodash';
import ModalManager from 'app/components/Modal/ModalManager';
import ChannelMembersList from 'scenes/Client/ChannelsBar/Modals/ChannelMembersList';
import RouterServices from 'app/services/RouterService';
import MainViewService from 'app/services/AppView/MainViewService';
import { Lock } from 'react-feather';
import SearchInput from '../Search';
import ChannelUsersHeader from './ChannelUsersHeader';
import { StarFilled } from '@ant-design/icons';
import PseudoMarkdownCompiler from 'services/Twacode/pseudoMarkdownCompiler.js';
import { ChannelResource } from 'app/models/Channel';
import ChannelAvatars from './ChannelAvatars';
import { getUserParts, useUsersListener } from 'app/components/Member/UserParts';
import Collections from 'app/services/CollectionsReact/Collections';
import { ChannelMemberResource } from 'app/models/Channel';
import { Search } from 'react-feather';
import Languages from 'services/languages/languages.js';
import SearchService from 'services/search/search.js';

export default (): JSX.Element => {
  const [hideSearchInput, setHideSearchInput] = useState<boolean>(true);
  const { companyId, workspaceId, channelId } = RouterServices.useStateFromRoute();

  const collectionPath: string = `/channels/v1/companies/${companyId}/workspaces/${workspaceId}/channels/${
    channelId || channelId
  }/members/`;
  const channelMembersCollection = Collections.get(collectionPath, ChannelMemberResource);

  const members = channelMembersCollection
    .useWatcher({}, { limit: 10 })
    .map(i => i.data.user_id || '');
  useUsersListener(members);
  const { avatar } = getUserParts({ usersIds: members, keepMyself: true, max: 10 });

  MainViewService.useWatcher(() => !!MainViewService.getViewCollection());
  const channelCollection = MainViewService.getViewCollection();
  if (!channelCollection?.useWatcher) {
    return <Col></Col>;
  }

  const channel: ChannelResource = channelCollection.useWatcher({
    id: channelId,
  })[0];

  if (!channel) {
    return <Col></Col>;
  }

  return (
    <Row align="middle" style={{ lineHeight: '47px', padding: 0, flexWrap: 'nowrap' }}>
      {
        // Temporary, it's for spacing when the hamburger menu is displayed
        <Col xs={1} sm={1} md={1} lg={0} xl={0} xxl={0}></Col>
      }
      {channel.data.visibility === 'direct' && (
        <Col xs={21} sm={21} md={22} lg={12} xl={14} xxl={16}>
          <ChannelUsersHeader channel={channel.data} />
        </Col>
      )}
      {channel.data.visibility !== 'direct' && (
        <Col xs={21} sm={21} md={22} lg={12} xl={14} xxl={16}>
          <span
            className="left-margin text-overflow"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <div className="small-right-margin" style={{ lineHeight: 0, width: 16 }}>
              <Emojione type={channel.data.icon || ''} />
            </div>
            <Typography.Text className="small-right-margin" strong>
              {startCase(channel.data.name)}
            </Typography.Text>
            {channel.data.visibility === 'private' && (
              <Lock size={16} className="small-right-margin" />
            )}
            <Typography.Text ellipsis className="markdown" style={{ lineHeight: '16px' }}>
              {PseudoMarkdownCompiler.compileToHTML(
                PseudoMarkdownCompiler.compileToJSON(
                  (channel.data.description || '').replace(/\n/g, ' '),
                ),
              )}
            </Typography.Text>
          </span>
        </Col>
      )}

      <Col xs={0} sm={0} md={0} lg={6} xl={5} xxl={4}>
        <Row
          align="middle"
          justify="end"
          gutter={[8, 0]}
          style={{ padding: 0, flexWrap: 'nowrap' }}
        >
          {channel.data.visibility !== 'direct' && channel.data.workspace_id && (
            <div className="small-right-margin" style={{ display: 'inline', lineHeight: 0 }}>
              <ChannelAvatars workspaceId={channel.data.workspace_id} />
            </div>
          )}
          {channel.data.visibility !== 'direct' && (
            <Button
              size="small"
              type="text"
              onClick={() => {
                ModalManager.open(<ChannelMembersList channel={channel} closable />, {
                  position: 'center',
                  size: { width: '600px', minHeight: '329px' },
                });
              }}
            >
              <Typography.Text>
                {Languages.t('scenes.apps.parameters.workspace_sections.members')}
              </Typography.Text>
            </Button>
          )}
        </Row>
      </Col>

      <Col xs={0} sm={0} md={0} lg={6} xl={5} xxl={4}>
        <Row justify="center">
          <SearchInput />
        </Row>
      </Col>

      <Col xs={1} sm={1} md={1} lg={0} xl={0} xxl={0}>
        <Button
          type="default"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'start' }}
          icon={<Search size={16} />}
          onClick={() => {
            SearchService.open();

            return console.log(SearchService.isOpen());
          }}
        />
      </Col>
    </Row>
  );
};

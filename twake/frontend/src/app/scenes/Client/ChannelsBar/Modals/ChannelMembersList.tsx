import React, { FC, useState } from 'react';
import { Button, Col, Row, Typography, Input } from 'antd';
import { Search } from 'react-feather';
import PerfectScrollbar from 'react-perfect-scrollbar';

import { ChannelMemberResource, ChannelResource } from 'app/models/Channel';
import { UserType } from 'app/models/User';

import Strings from 'services/utils/strings.js';
import Languages from 'services/languages/languages.js';
import UsersService from 'services/user/user.js';
import Collections from 'services/CollectionsReact/Collections';
import ModalManager from 'app/components/Modal/ModalManager';
import ChannelMembersEditor from 'scenes/Client/ChannelsBar/Modals/ChannelMembersEditor';
import MemberChannelRow from 'scenes/Client/ChannelsBar/Parts/Header/MemberChannelRow.tsx';

import ObjectModal from 'components/ObjectModal/ObjectModal';
import { useUsersListener } from 'app/components/Member/UserParts';

type Props = {
  closable?: boolean;
  channel: ChannelResource;
};

const { Link } = Typography;
const defaultLimit = 100;

const ChannelMembersList: FC<Props> = props => {
  const { company_id, workspace_id, id } = props.channel.data;

  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(defaultLimit);
  const [searchedUsers, setSearchedUsers] = useState<string[]>([]);

  const collectionPath: string = `/channels/v1/companies/${company_id}/workspaces/${workspace_id}/channels/${id}/members/`;
  const channelMembersCollection = Collections.get(collectionPath, ChannelMemberResource);
  const channelMembers = channelMembersCollection.useWatcher({}, { limit: limit });
  const channelMembersUid = channelMembers.map(member => member.data.user_id || '');

  useUsersListener(channelMembersUid || []);

  const onSearchMembers = (text: string) => {
    setSearch(text);
    return UsersService.search(
      Strings.removeAccents(text),
      {
        scope: 'workspace',
        workspace_id: workspace_id,
      },
      (res: UserType[]) => {
        setSearchedUsers(
          res.filter(user => channelMembersUid.includes(user.id || '')).map(user => user.id || ''),
        );
      },
    );
  };

  return (
    <ObjectModal
      title={Languages.t('scenes.client.channelbar.channelmemberslist.title', [
        channelMembers.length, // Not true with the limit
        props.channel.data.name,
      ])}
      closable={props.closable ? props.closable : false}
    >
      <div className="x-margin">
        <Row align="middle" gutter={[28, 0]} style={{ marginBottom: '24px' }}>
          <Col flex={14}>
            <Input
              size={'large'}
              suffix={<Search size={20} style={{ color: 'var(--grey-dark)' }} />}
              placeholder={Languages.t('scenes.client.channelbar.channelmemberslist.autocomplete')}
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchMembers(e.target.value)}
            />
          </Col>
          <Col>
            <Button
              style={{ width: '84px', height: '32px', padding: '0' }}
              type="primary"
              onClick={() => {
                return ModalManager.open(
                  <ChannelMembersEditor
                    companyId={props.channel.data.company_id || ''}
                    workspaceId={props.channel.data.workspace_id || ''}
                    channelId={props.channel.data.id || ''}
                    channelName={props.channel.data.name}
                    onClose={() => ModalManager.closeAll()}
                  />,
                  {
                    position: 'center',
                    size: { width: '600px', minHeight: '329px' },
                  },
                );
              }}
            >
              {Languages.t('scenes.client.channelbar.channelmemberslist.invitebtn')}
            </Button>
          </Col>
        </Row>
      </div>
      <PerfectScrollbar
        style={{ maxHeight: '240px', height: '240px', width: '100%' }}
        component="div"
        options={{ suppressScrollX: true, suppressScrollY: false }}
      >
        {!search.length &&
          channelMembers.length > 0 &&
          channelMembers.map(user => (
            <div key={user.id} className="x-margin">
              <MemberChannelRow
                key={user.id}
                userId={user.data.user_id || ''}
                collection={channelMembersCollection}
                channelMemberResource={user}
              />
            </div>
          ))}
        {!search.length && !channelMembers.length && (
          <Row
            align="middle"
            justify="center"
            className="smalltext x-margin"
            style={{ textAlign: 'center', height: '144px' }}
          >
            {Languages.t('scenes.client.channelbar.channelmemberslist.no_members')}
          </Row>
        )}
        {!!search.length &&
          searchedUsers.map(userId => (
            <div key={userId} className="x-margin">
              <MemberChannelRow key={userId} userId={userId} />
            </div>
          ))}

        {!!search.length && searchedUsers.length === 0 && (
          <Row
            align="middle"
            justify="center"
            className="smalltext x-margin"
            style={{ textAlign: 'center', height: '144px' }}
          >
            {Languages.t('components.user_picker.modal_no_result')}
          </Row>
        )}
        {!searchedUsers.length &&
          limit < searchedUsers.length + defaultLimit &&
          setLimit(searchedUsers.length + defaultLimit)}
      </PerfectScrollbar>
      {channelMembers.length >= limit && (
        <Row align="middle" justify="center" gutter={[0, 16]}>
          <Link
            className="small-y-margin"
            style={{ color: 'var(--grey-dark)' }}
            onClick={() => setLimit(channelMembers.length + defaultLimit)}
          >
            {Languages.t('scenes.client.channelbar.channelmemberslist.loader')}
          </Link>
        </Row>
      )}
      {/* {text when there's no search and want more result} */}
    </ObjectModal>
  );
};

export default ChannelMembersList;

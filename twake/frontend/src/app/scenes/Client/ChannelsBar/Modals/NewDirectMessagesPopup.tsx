import React, { FC, useState } from 'react';

import Languages from 'services/languages/languages.js';
import Button from 'components/Buttons/Button.js';
import MediumPopupComponent from 'app/components/Modal/ModalManager';
import ObjectModal from 'components/ObjectModal/ObjectModal';
import UserListManager from 'components/UserListManager/UserListManager';
import { ChannelType, ChannelResource } from 'app/models/Channel';
import Collections from 'app/services/CollectionsReact/Collections';
import UsersService from 'services/user/user.js';
import RouterServices from 'app/services/RouterService';

const NewDirectMessagesPopup: FC = () => {
  const [newUserDiscussion, setNewUserDiscussion] = useState<string[]>([]);

  const { workspaceId, companyId } = RouterServices.useRouteState(({ workspaceId, companyId }) => {
    return { workspaceId, companyId };
  });
  const company_id = companyId;

  const collectionPath: string = `/channels/v1/companies/${company_id}/workspaces/direct/channels/::mine`;
  const ChannelsCollections = Collections.get(collectionPath, ChannelResource);

  const upsertDirectMessage = async (): Promise<any> => {
    let membersIds = newUserDiscussion;
    membersIds.push(UsersService.getCurrentUserId());
    membersIds = membersIds.filter((e, index) => newUserDiscussion.indexOf(e) === index);

    const newDirectMessage: ChannelType = {
      company_id: company_id,
      workspace_id: workspaceId,
      visibility: 'direct',
      direct_channel_members: membersIds,
    };

    await ChannelsCollections.upsert(new ChannelResource(newDirectMessage), {
      query: { members: membersIds },
    });

    return MediumPopupComponent.closeAll();
  };

  return (
    <ObjectModal
      title={Languages.t('scenes.app.channelsbar.channelsuser.new_private_discussion')}
      closable
      footer={
        <Button
          className="small primary"
          style={{ width: 'auto', float: 'right' }}
          disabled={newUserDiscussion.length === 0}
          onClick={() => upsertDirectMessage()}
        >
          {Languages.t('general.continue', [], 'Continue')}
        </Button>
      }
    >
      <div className="x-margin">
        <UserListManager
          max={10}
          users={[]}
          canRemoveMyself
          noPlaceholder
          scope="group"
          autoFocus
          onUpdate={(ids: string[]) => setNewUserDiscussion(ids)}
        />
      </div>
    </ObjectModal>
  );
};

export default NewDirectMessagesPopup;

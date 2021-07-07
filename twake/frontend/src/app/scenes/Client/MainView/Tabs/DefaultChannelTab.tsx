import React from 'react';
import RouterServices from 'app/services/RouterService';
import DepreciatedCollections from 'app/services/Depreciated/Collections/Collections';
import WorkspacesApps from 'services/workspaces/workspaces_apps.js';
import Menu from 'components/Menus/Menu.js';
import { MoreHorizontal, MessageCircle } from 'react-feather';
import Languages from 'services/languages/languages';
import popupManager from 'services/popupManager/popupManager.js';
import WorkspaceParameter from '../../Popup/WorkspaceParameter/WorkspaceParameter';
import { AppType } from 'app/models/App';
import { ChannelResource } from 'app/models/Channel';
import Collections from 'services/CollectionsReact/Collections';
import ConnectorsListManager from 'app/components/ConnectorsListManager/ConnectorsListManager';
import MainViewService from 'app/services/AppView/MainViewService';
import { isArray } from 'lodash';

export default ({ selected }: { selected: boolean }): JSX.Element => {
  const apps = WorkspacesApps.getApps().filter(app => (app.display || {}).channel);
  const { companyId, workspaceId, channelId } = RouterServices.getStateFromRoute();

  const collectionPath = `/channels/v1/companies/${companyId}/workspaces/${workspaceId}/channels/::mine`;
  const channelsCollections = Collections.get(collectionPath, ChannelResource);
  const channelResource: ChannelResource = channelsCollections.useWatcher({ id: channelId })[0];

  const configureChannelConnector = (app: AppType): void => {
    return WorkspacesApps.notifyApp(app.id, 'configuration', 'channel', {
      channel: channelResource.data,
    });
  };

  const onChange = (ids: string[]): void => {
    channelResource.data.connectors = ids;
    channelsCollections.upsert(channelResource);
  };

  const current = () => {
    return (
      isArray(channelResource.data.connectors) &&
      channelResource.data.connectors.map((id: string) =>
        DepreciatedCollections.get('applications').find(id),
      )
    );
  };

  const configurable = (item: any) =>
    ((item.display || {}).configuration || {}).can_configure_in_channel;

  if (selected) {
    MainViewService.select(MainViewService.getId(), {
      collection: MainViewService.getConfiguration().collection,
      app: { simple_name: 'messages' },
      context: null,
      hasTabs: MainViewService.getConfiguration().hasTabs,
    });
  }

  return (
    <span
      className="align-items-center"
      onClick={() => {
        const route: string = RouterServices.generateRouteFromState({
          tabId: '',
        });
        return RouterServices.push(route);
      }}
    >
      <MessageCircle size={14} className="small-right-margin" />

      <span className="small-right-margin">{Languages.t('scenes.app.mainview.discussion')}</span>

      {!!selected && (
        <Menu
          style={{ lineHeight: 0 }}
          menu={[
            {
              type: 'menu',
              text: Languages.t('scenes.apps.tasks.connectors_menu'),
              submenu: [
                {
                  type: 'react-element',
                  reactElement: () => {
                    if (apps.length) {
                      return (
                        <ConnectorsListManager
                          list={apps}
                          current={current() || []}
                          configurable={configurable}
                          onChange={onChange}
                          onConfig={configureChannelConnector}
                        />
                      );
                    }
                    return (
                      <div className="menu-text">
                        {Languages.t(
                          'scenes.app.mainview.tabs.no_connected_connectors_for_channel',
                          [],
                          "Vous n'avez aucun connecteur capable de se connecter à une chaîne.",
                        )}
                      </div>
                    );
                  },
                },
                { type: 'separator' },
                {
                  type: 'menu',
                  text: Languages.t(
                    'scenes.app.mainview.tabs.searching_connectors',
                    [],
                    'Chercher des connecteurs...',
                  ),
                  onClick: () =>
                    popupManager.open(
                      <WorkspaceParameter initial_page={3} options={'open_search_apps'} />,
                      true,
                    ),
                },
              ],
            },
          ]}
        >
          <MoreHorizontal size={14} />
        </Menu>
      )}
    </span>
  );
};

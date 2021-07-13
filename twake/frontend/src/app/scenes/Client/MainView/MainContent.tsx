import React, { FC } from 'react';

import { Layout } from 'antd';
import Tabs from './Tabs/Tabs';
import AppView from './AppView/AppView';
import SideViewService from 'app/services/AppView/SideViewService';
import MainViewService from 'app/services/AppView/MainViewService';
import NoApp from './NoApp';
import { X } from 'react-feather';
import ViewName from './AppView/ViewName';

const MainContent: FC<{}> = () => {
  const [mainType, mainId] = MainViewService.useWatcher(() => [
    MainViewService.getViewType(),
    MainViewService.getId(),
  ]);
  const mainConfiguration = MainViewService.getConfiguration();
  const [sideType, sideId] = SideViewService.useWatcher(() => [
    SideViewService.getViewType(),
    SideViewService.getId(),
  ]);

  return (
    <Layout.Content className={'global-view-content'}>
      <Layout style={{ flex: '1' }}>
        {mainConfiguration.hasTabs && (
          <Layout.Header className="main-view-tabs-header">
            <Tabs key={mainId} />
          </Layout.Header>
        )}
        <Layout style={{ height: '100%' }} hasSider>
          <Layout.Content>
            <Layout className="main-view-layout">
              <Layout.Content className="main-view-content">
                {mainType !== '' && (
                  <AppView key={mainId} id={mainId} viewService={MainViewService} />
                )}
                {mainType === '' && <NoApp />}
              </Layout.Content>
            </Layout>
          </Layout.Content>
          <Layout.Sider
            trigger={null}
            className="global-side-view"
            breakpoint="lg"
            collapsedWidth="0"
            theme="light"
            width="40%"
            collapsed={sideType === ''}
          >
            {!!sideType && (
              <Layout style={{ height: '100%' }}>
                <Layout.Header className="side-header">
                  <ViewName
                    key={sideId + '-side-header'}
                    id={sideId}
                    viewService={SideViewService}
                  />
                  <X onClick={() => SideViewService.select('', { context: {} })} />
                </Layout.Header>
                <Layout.Content style={{ flex: 1 }}>
                  <AppView key={sideId + '-side'} id={sideId} viewService={SideViewService} />
                </Layout.Content>
              </Layout>
            )}
          </Layout.Sider>
        </Layout>
      </Layout>
    </Layout.Content>
  );
};

export default MainContent;

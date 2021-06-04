import React from 'react';
import { Typography, Button } from 'antd';
import Banner from 'app/components/Banner/Banner';
import Emojione from 'app/components/Emojione/Emojione';
import RouterService from 'app/services/RouterService';
import Languages from 'services/languages/languages.js';
import './LockedHistoryBanner.scss';

const LockedHistoryBanner = (): JSX.Element => {
  const { companyId } = RouterService.getStateFromRoute();
  const pricingPlanUrl = `https://console.twake.app/companies/${companyId}/subscription`;
  const onClickBtn = () => window.open(pricingPlanUrl, 'blank');

  return (
    <Banner
      type="ghost"
      height={135}
      className="locked-history-banner"
      contentColumnStyle={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        width: '380px',
      }}
    >
      <div className="title-container">
        <Emojione type=":rocket:" s64 />
        <Typography.Title level={5} className="title">
          {Languages.t('components.locked_features.locked_history_banner.title')}
        </Typography.Title>
      </div>
      <Typography.Text type="secondary" className="description">
        {Languages.t('components.locked_features.locked_history_banner.description')}
      </Typography.Text>
      <Button type="primary" size="middle" onClick={onClickBtn} style={{ margin: '16px 0 16px 0' }}>
        {Languages.t('components.locked_features.locked_history_banner.button')}
      </Button>
    </Banner>
  );
};

export default LockedHistoryBanner;

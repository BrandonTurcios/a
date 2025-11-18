import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const DashboardHome = ({ sessionData }) => {
  const { t } = useTranslation();

  return (
    <div style={{
      padding: '24px',
      background: '#F8F9FA',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0, color: '#333333' }}>
          {t('dashboard.title')}
        </Title>
        <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
          {t('dashboard.subtitle')}
        </Paragraph>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={3} style={{ marginBottom: '16px' }}>{t('dashboard.sessionInfo')}</Title>

        <div style={{ lineHeight: '1.8' }}>
          <p><strong>{t('dashboard.user')}</strong> {sessionData?.username}</p>
          <p><strong>{t('dashboard.database')}</strong> {sessionData?.database}</p>
          <p><strong>{t('dashboard.userId')}</strong> {sessionData?.userId}</p>
          <p><strong>{t('dashboard.status')}</strong> {t('dashboard.statusActive')}</p>
          <p><strong>{t('dashboard.loginTime')}</strong> {new Date(sessionData?.loginTime).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

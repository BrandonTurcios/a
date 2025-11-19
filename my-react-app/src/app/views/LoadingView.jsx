import React from 'react';
import { useTranslation } from 'react-i18next';
import { Spin, Typography } from 'antd';

const { Text } = Typography;

const LoadingView = () => {
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 64px)',
      background: 'var(--color-background)'
    }}>
      <Spin size="large" />
      <Text style={{ marginTop: '16px', color: '#999' }}>
        {t('loading.content')}
      </Text>
    </div>
  );
};

export default LoadingView;

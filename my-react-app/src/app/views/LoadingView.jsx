import React from 'react';
import { Spin, Typography } from 'antd';

const { Text } = Typography;

const LoadingView = () => {
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
      <Text style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>
        Cargando contenido...
      </Text>
    </div>
  );
};

export default LoadingView;

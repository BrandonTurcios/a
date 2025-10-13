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
      background: '#F8F9FA'
    }}>
      <Spin size="large" />
      <Text style={{ marginTop: '16px', color: '#999' }}>
        Cargando contenido...
      </Text>
    </div>
  );
};

export default LoadingView;

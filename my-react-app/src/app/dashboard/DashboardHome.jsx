import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const DashboardHome = ({ sessionData }) => {
  return (
    <div style={{
      padding: '24px',
      background: '#F8F9FA',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0, color: '#333333' }}>
          Dashboard
        </Title>
        <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
          Current session information
        </Paragraph>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={3} style={{ marginBottom: '16px' }}>Session Information</Title>

        <div style={{ lineHeight: '1.8' }}>
          <p><strong>User:</strong> {sessionData?.username}</p>
          <p><strong>Database:</strong> {sessionData?.database}</p>
          <p><strong>User ID:</strong> {sessionData?.userId}</p>
          <p><strong>Status:</strong> Active</p>
          <p><strong>Login Time:</strong> {new Date(sessionData?.loginTime).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

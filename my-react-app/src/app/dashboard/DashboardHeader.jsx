import React from 'react';
import { Layout, Button, Input, Avatar, Typography, Tooltip } from 'antd';
import { MenuOutlined, SearchOutlined, LogoutOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const DashboardHeader = ({ sessionData, onLogout, onToggleSidebar }) => {
  return (
    <Header style={{
      background: 'white',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: '64px',
      borderBottom: '1px solid #E0E7EB'
    }}>
      {/* Left: Menu button + Logo + Title */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onToggleSidebar}
          style={{
            color: '#333333',
            marginRight: '16px',
            fontSize: '18px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: '#00A88E',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>T</span>
          </div>
          <Title level={4} style={{ color: '#333333', margin: 0 }}>
            Tryton Management System
          </Title>
        </div>
      </div>

      {/* Center/Right: Search + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Search
          placeholder="Search in the system..."
          prefix={<SearchOutlined style={{ color: '#6C757D' }} />}
          style={{
            width: 320,
            background: '#F8F9FA',
            border: '1px solid #E0E7EB',
            color: '#333333',
            borderRadius: '8px'
          }}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: '#F8F9FA',
            borderRadius: '8px',
            border: '1px solid #E0E7EB'
          }}>
            <Avatar
              style={{
                background: '#00A88E',
                color: 'white',
                width: '28px',
                height: '28px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {sessionData?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text style={{ color: '#333333', fontSize: '13px', fontWeight: '500', lineHeight: '1.2' }}>
                {sessionData?.username || 'Usuario'}
              </Text>
              <Text style={{ color: '#6C757D', fontSize: '11px', lineHeight: '1.2' }}>
                {sessionData?.database || 'Database'}
              </Text>
            </div>
          </div>
          <Tooltip title="Sign out">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={onLogout}
              style={{
                color: '#6C757D',
                width: '32px',
                height: '32px'
              }}
            />
          </Tooltip>
        </div>
      </div>
    </Header>
  );
};

export default DashboardHeader;

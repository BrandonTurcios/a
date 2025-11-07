import React from 'react';
import { Layout, Button, Input, Avatar, Typography, Tooltip } from 'antd';
import { MenuOutlined, SearchOutlined, LogoutOutlined } from '@ant-design/icons';
import LanguageSelector from '../../components/LanguageSelector';

const { Header } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const DashboardHeader = ({ sessionData, onLogout, onToggleSidebar, onLanguageChange }) => {
  return (
    <Header style={{
      background: 'var(--color-neutral-50)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: '64px',
      borderBottom: '2px solid var(--color-primary)'
    }}>
      {/* Left: Menu button + Logo + Title */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onToggleSidebar}
          style={{
            color: 'var(--color-text-primary)',
            marginRight: '16px',
            fontSize: '18px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-400) 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            boxShadow: '0 2px 6px rgba(1, 118, 143, 0.3)'
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>T</span>
          </div>
          <Title level={4} style={{ 
            color: 'var(--color-primary-700)', 
            margin: 0,
            fontWeight: '600',
            background: 'linear-gradient(135deg, var(--color-primary-700) 0%, var(--color-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Tryton Management System
          </Title>
        </div>
      </div>

      {/* Center/Right: Search + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Search
          placeholder="Search in the system..."
          prefix={<SearchOutlined style={{ color: 'var(--color-text-secondary)' }} />}
          style={{
            width: 320,
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
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
            background: 'var(--color-primary-50)',
            borderRadius: '10px',
            border: '1px solid var(--color-primary-200)',
            padding: '8px 14px'
          }}>
            <Avatar
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary-500) 100%)',
                color: 'white',
                width: '32px',
                height: '32px',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(1, 118, 143, 0.2)'
              }}
            >
              {sessionData?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: '500', lineHeight: '1.2' }}>
                {sessionData?.username || 'Usuario'}
              </Text>
              <Text style={{ color: 'var(--color-text-secondary)', fontSize: '11px', lineHeight: '1.2' }}>
                {sessionData?.database || 'Database'}
              </Text>
            </div>
          </div>
          <LanguageSelector
            value={sessionData?.language || 'en'}
            onChange={onLanguageChange}
            style={{ width: 180 }}
          />
          <Tooltip title="Sign out">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={onLogout}
              style={{
                color: 'var(--color-text-secondary)',
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

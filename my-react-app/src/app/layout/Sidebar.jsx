import React, { useEffect } from 'react';
import { Layout, Spin, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import MenuTree from './MenuTree';

const { Sider } = Layout;

const Sidebar = ({ open, menuItems, loading, error, expandedMenus, activeTab, onMenuClick, onRetry }) => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .sidebar-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .sidebar-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 3px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.5);
      }
      .menu-item-button:hover:not([disabled]) {
        background: rgba(255,255,255,0.1) !important;
      }
      .menu-item-button.ant-btn-primary:hover {
        background: #007BFF !important;
      }
      .menu-item-button[style*="background: rgb(0, 123, 255)"]:hover {
        background: #007BFF !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={!open}
      width={320}
      collapsedWidth={80}
      breakpoint="lg"
      onBreakpoint={() => {
        // Esto se maneja en el hook useMenuData
      }}
      style={{
        background: '#00A88E',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 100,
        overflow: 'hidden'
      }}
    >
      <div className="sidebar-scroll" style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '64px',
        paddingBottom: '16px'
      }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin size="large" />
            <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.7)' }}>Cargando menú...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '16px' }}>
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
                  Reintentar
                </Button>
              }
            />
          </div>
        ) : (
          <MenuTree
            items={menuItems}
            activeTab={activeTab}
            expandedMenus={expandedMenus}
            onMenuClick={onMenuClick}
            sidebarOpen={open}
          />
        )}
      </div>
    </Sider>
  );
};

export default Sidebar;

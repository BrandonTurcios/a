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
        background: var(--color-neutral-400);
        border-radius: 3px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: var(--color-neutral-500);
      }
      .menu-item-button:hover:not([disabled]) {
        background: var(--color-neutral-200) !important;
      }
      .menu-item-button.ant-btn-primary:hover {
        background: var(--color-primary-50) !important;
      }
      .menu-item-button[style*="background"]:hover {
        background: var(--color-primary-50) !important;
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
        background: 'var(--color-neutral-50)',
        borderRight: '1px solid var(--color-border)',
        boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
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
            <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>Cargando menú...</p>
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

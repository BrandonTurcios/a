import React from 'react';
import { Tabs, Button, Dropdown, Menu } from 'antd';
import { CloseOutlined, MoreOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const TabsBar = ({ 
  tabs, 
  activeTabId, 
  onTabChange, 
  onCloseTab, 
  onCloseAllTabs 
}) => {
  const handleTabChange = (key) => {
    onTabChange(key);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    onCloseTab(tabId);
  };

  const getTabMenu = (tabId) => (
    <Menu>
      <Menu.Item key="close" onClick={() => onCloseTab(tabId)}>
        Cerrar
      </Menu.Item>
      <Menu.Item key="closeOthers" onClick={() => {
        // Cerrar todas excepto esta
        tabs.forEach(tab => {
          if (tab.id !== tabId) {
            onCloseTab(tab.id);
          }
        });
      }}>
        Cerrar otras
      </Menu.Item>
      <Menu.Item key="closeAll" onClick={onCloseAllTabs}>
        Cerrar todas
      </Menu.Item>
    </Menu>
  );

  const renderTabPane = (tab) => {
    const isActive = tab.id === activeTabId;
    
    return (
      <TabPane
        tab={
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '4px 8px',
              background: isActive ? 'var(--color-primary-50)' : 'transparent',
              borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: isActive ? 'var(--color-primary-700)' : 'var(--color-text-secondary)',
              fontWeight: isActive ? '600' : '400',
              borderRadius: '4px',
              minWidth: '120px',
              maxWidth: '200px'
            }}
          >
            <span 
              style={{ 
                flex: 1, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '13px'
              }}
              title={tab.title}
            >
              {tab.title}
            </span>
            {tab.closable && (
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={(e) => handleCloseTab(e, tab.id)}
                style={{
                  width: '16px',
                  height: '16px',
                  minWidth: '16px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px'
                }}
              />
            )}
            {tab.closable && (
              <Dropdown
                overlay={getTabMenu(tab.id)}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  style={{
                    width: '16px',
                    height: '16px',
                    minWidth: '16px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }}
                />
              </Dropdown>
            )}
          </div>
        }
        key={tab.id}
        closable={false}
      />
    );
  };

  return (
    <div style={{
      background: 'var(--color-neutral-50)',
      borderBottom: '2px solid var(--color-primary-200)',
      padding: '0 16px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <Tabs
        activeKey={activeTabId}
        onChange={handleTabChange}
        type="card"
        size="small"
        style={{
          flex: 1,
          margin: 0
        }}
        tabBarStyle={{
          margin: 0,
          border: 'none'
        }}
      >
        {tabs.map(tab => renderTabPane(tab))}
      </Tabs>
    </div>
  );
};

export default TabsBar;

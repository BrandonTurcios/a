import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
        {t('common.close')}
      </Menu.Item>
      <Menu.Item key="closeOthers" onClick={() => {
        // Cerrar todas excepto esta
        tabs.forEach(tab => {
          if (tab.id !== tabId) {
            onCloseTab(tab.id);
          }
        });
      }}>
        {t('common.closeOthers')}
      </Menu.Item>
      <Menu.Item key="closeAll" onClick={onCloseAllTabs}>
        {t('common.closeAll')}
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
              gap: '10px',
              padding: '8px 16px',
              background: isActive ? 'var(--color-primary-50)' : 'transparent',
              borderBottom: isActive ? '4px solid var(--color-primary)' : '4px solid transparent',
              color: isActive ? 'var(--color-primary-700)' : 'var(--color-text-secondary)',
              fontWeight: isActive ? '600' : '500',
              borderRadius: '8px',
              minWidth: '140px',
              maxWidth: '220px',
              fontSize: '14px',
              lineHeight: 1.2
            }}
          >
            <span 
              style={{ 
                flex: 1, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '14px'
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
                menu={{ items: getTabMenu(tab.id).props.children.map(item => ({
                  key: item.key,
                  label: item.props.children,
                  onClick: item.props.onClick
                })) }}
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
      borderBottom: '1px solid var(--color-primary-200)',
      padding: '10px 18px',
      minHeight: '52px',
      display: 'flex',
      alignItems: 'center',
      overflowX: 'auto',
      maxWidth: '100%',
      marginTop: '4px',
      marginBottom: '12px',
      borderRadius: '0 0 12px 12px'
    }}>
      <Tabs
        activeKey={activeTabId}
        onChange={handleTabChange}
        type="card"
        size="small"
        style={{
          flex: 1,
          margin: 0,
          minWidth: 'fit-content'
        }}
        tabBarStyle={{
          margin: 0,
          border: 'none',
          flexWrap: 'nowrap'
        }}
      >
        {tabs.map(tab => renderTabPane(tab))}
      </Tabs>
    </div>
  );
};

export default TabsBar;

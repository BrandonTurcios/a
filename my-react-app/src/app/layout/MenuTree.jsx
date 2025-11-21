import React from 'react';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import MenuItem from './MenuItem';

const MenuTree = ({ items, activeTab, expandedMenus, loadingMenuChildren, onMenuClick, level = 0, sidebarOpen }) => {
  const { t } = useTranslation();

  if (!items || items.length === 0) return null;

  return (
    <div style={{ padding: level === 0 ? '8px 0' : '0' }}>
      {items.map((item) => {
        const hasChildren = (item.childs && item.childs.length > 0) || item.hasChildren;
        const isExpanded = expandedMenus.has(item.id);
        const isActive = activeTab === item.id;
        const isLoadingChildren = loadingMenuChildren && loadingMenuChildren.has(item.id);

        return (
          <div key={item.id} style={{ marginBottom: '2px' }}>
            <MenuItem
              item={item}
              isActive={isActive}
              isExpanded={isExpanded}
              hasChildren={hasChildren}
              level={level}
              onClick={onMenuClick}
              sidebarOpen={sidebarOpen}
            />

            {isExpanded && (
              <>
                {isLoadingChildren && (
                  <div style={{
                    padding: '8px 16px',
                    paddingLeft: `${(level + 1) * 20 + 16}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--color-neutral-600)'
                  }}>
                    <Spin size="small" />
                    <span style={{ fontSize: '12px' }}>{t('sidebar.loadingChildren')}</span>
                  </div>
                )}
                {!isLoadingChildren && item.childs && item.childs.length > 0 && (
                  <MenuTree
                    items={item.childs}
                    activeTab={activeTab}
                    expandedMenus={expandedMenus}
                    loadingMenuChildren={loadingMenuChildren}
                    onMenuClick={onMenuClick}
                    level={level + 1}
                    sidebarOpen={sidebarOpen}
                  />
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MenuTree;

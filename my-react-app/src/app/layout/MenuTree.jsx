import React from 'react';
import MenuItem from './MenuItem';

const MenuTree = ({ items, activeTab, expandedMenus, onMenuClick, level = 0, sidebarOpen }) => {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ padding: level === 0 ? '16px 0' : '0' }}>
      {items.map((item) => {
        const hasChildren = item.childs && item.childs.length > 0;
        const isExpanded = expandedMenus.has(item.id);
        const isActive = activeTab === item.id;

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

            {hasChildren && isExpanded && (
              <MenuTree
                items={item.childs}
                activeTab={activeTab}
                expandedMenus={expandedMenus}
                onMenuClick={onMenuClick}
                level={level + 1}
                sidebarOpen={sidebarOpen}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MenuTree;

import React from 'react';
import { Button, Space, Typography } from 'antd';
import { RightOutlined, DownOutlined } from '@ant-design/icons';
import { getIconComponent } from '../utils/iconMapper.jsx'

const { Text } = Typography;

const MenuItem = ({ item, isActive, isExpanded, hasChildren, level = 0, onClick, sidebarOpen }) => {
  const isChild = level > 0;

  return (
    <div style={{
      marginLeft: isChild && sidebarOpen ? `${level * 20}px` : '0',
      position: 'relative',
      padding: '0 16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
        {/* Flecha indicadora para elementos hijo */}
        {isChild && sidebarOpen && (
          <div style={{
            marginRight: '8px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px'
          }}>
            →
          </div>
        )}

        {/* Botón principal del menú */}
        <Button
          type="text"
          onClick={() => onClick(item)}
          className="menu-item-button"
          style={{
            flex: 1,
            height: 'auto',
            padding: sidebarOpen ? '12px 16px' : '12px 8px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            background: isActive ? '#007BFF' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            minHeight: '40px',
            position: 'relative',
            maxWidth: '100%',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
          title={sidebarOpen ? (item.description || item.name) : item.name}
        >
          {sidebarOpen ? (
            <Space style={{ width: '100%', minWidth: 0 }}>
              {getIconComponent(item)}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 0,
                flex: 1
              }}>
                <Text
                  style={{
                    fontSize: '14px',
                    fontWeight: isChild ? '400' : '500',
                    color: 'white',
                    wordBreak: 'break-word',
                    lineHeight: '1.3'
                  }}
                  ellipsis={{ tooltip: true }}
                >
                  {item.name}
                </Text>
                {item.type === 'module' && item.model && (
                  <Text
                    style={{
                      fontSize: '12px',
                      opacity: 0.7,
                      color: 'rgba(255,255,255,0.7)',
                      wordBreak: 'break-word',
                      lineHeight: '1.2'
                    }}
                    ellipsis={{ tooltip: true }}
                  >
                    {item.model}
                  </Text>
                )}
              </div>
            </Space>
          ) : (
            getIconComponent(item)
          )}
        </Button>

        {/* Indicador de expansión/contracción (solo si sidebar está abierto) */}
        {hasChildren && sidebarOpen && (
          <div style={{
            marginLeft: '4px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px'
          }}>
            {isExpanded ? <DownOutlined /> : <RightOutlined />}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItem;

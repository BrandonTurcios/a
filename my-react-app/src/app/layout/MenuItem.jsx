import React from 'react';
import { Button, Space, Typography } from 'antd';
import { ChevronRight, ChevronDown, Minus } from 'lucide-react';
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
        {/* Indicador visual de nivel para elementos hijo */}
        {isChild && sidebarOpen && (
          <div style={{
            marginRight: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            color: 'var(--color-primary-600)',
            opacity: 0.6
          }}>
            <Minus 
              size={16} 
              strokeWidth={3}
              style={{
                transform: 'rotate(90deg)'
              }}
            />
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
            background: isActive ? 'var(--color-primary-50)' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: isActive ? 'var(--color-primary-600)' : 'var(--color-text-primary)',
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
                    fontSize: '15px',
                    fontWeight: isChild ? '500' : '600',
                    color: isActive ? 'var(--color-primary-600)' : 'var(--color-text-primary)',
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
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-text-secondary)',
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
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? 'var(--color-primary-600)' : 'var(--color-primary-700)',
            transition: 'all 0.2s ease'
          }}>
            {isExpanded ? (
              <ChevronDown 
                size={20} 
                strokeWidth={2.5}
                style={{
                  fontWeight: 'bold'
                }}
              />
            ) : (
              <ChevronRight 
                size={20} 
                strokeWidth={2.5}
                style={{
                  fontWeight: 'bold'
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItem;

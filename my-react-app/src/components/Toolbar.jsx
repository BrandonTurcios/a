import React from 'react';
import { Button, Space, InputNumber, Tooltip, Dropdown, Menu } from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  ReloadOutlined,
  LinkOutlined,
  CommentOutlined,
  SettingOutlined,
  PrinterOutlined,
  MailOutlined,
  LeftOutlined,
  RightOutlined,
  SwapOutlined,
  FileOutlined
} from '@ant-design/icons';

const Toolbar = ({ 
  toolbarInfo, 
  currentRecord = 1, 
  totalRecords = 1,
  onNavigate,
  onCreate,
  onSave,
  onRefresh,
  onAttach,
  onComment,
  onAction,
  onRelate,
  onPrint,
  onEmail,
  loading = false,
  viewType = 'tree', // Current view type ('tree' or 'form')
  onSwitchView, // Handler for view switching
  isDirty = false // Whether there are unsaved changes
}) => {
  if (!toolbarInfo) {
    return null;
  }

  const { action = [], relate = [], print = [], emails = [] } = toolbarInfo;

  // Renderizar botones de navegación
  const renderNavigationButtons = () => (
    <Space.Compact>
      <Tooltip title={viewType === 'form' ? 'Switch to list view' : 'Switch view'}>
        <Button 
          icon={<SwapOutlined />} 
          onClick={onSwitchView}
          disabled={loading || viewType === 'tree'}
          type={isDirty ? 'primary' : 'default'}
        />
      </Tooltip>
      <Tooltip title="Anterior">
        <Button 
          icon={<LeftOutlined />} 
          onClick={() => onNavigate?.('previous')}
          disabled={loading || currentRecord <= 1}
        />
      </Tooltip>
      <InputNumber
        value={currentRecord}
        min={1}
        max={totalRecords}
        controls={false}
        style={{ width: 60, textAlign: 'center' }}
        onChange={(value) => onNavigate?.('goto', value)}
        disabled={loading}
      />
      <Tooltip title="Siguiente">
        <Button 
          icon={<RightOutlined />} 
          onClick={() => onNavigate?.('next')}
          disabled={loading || currentRecord >= totalRecords}
        />
      </Tooltip>
    </Space.Compact>
  );

  // Renderizar botones de acción CRUD
  const renderActionButtons = () => (
    <Space.Compact>
      <Tooltip title="Crear nuevo">
        <Button 
          type="primary"
          icon={<PlusOutlined />} 
          onClick={onCreate}
          disabled={loading}
        />
      </Tooltip>
      <Tooltip title="Guardar">
        <Button 
          icon={<SaveOutlined />} 
          onClick={onSave}
          disabled={loading}
        />
      </Tooltip>
      <Tooltip title="Actualizar">
        <Button 
          icon={<ReloadOutlined />} 
          onClick={onRefresh}
          disabled={loading}
        />
      </Tooltip>
    </Space.Compact>
  );

  // Renderizar botones de adjuntos y comentarios
  const renderAttachmentButtons = () => (
    <Space.Compact>
      <Tooltip title="Adjuntos">
        <Button 
          icon={<FileOutlined />} 
          onClick={onAttach}
          disabled={loading}
        />
      </Tooltip>
      <Tooltip title="Comentarios">
        <Button 
          icon={<CommentOutlined />} 
          onClick={onComment}
          disabled={loading}
        />
      </Tooltip>
    </Space.Compact>
  );

  // Renderizar dropdown de acciones
  const renderActionsDropdown = () => {
    if (!action || action.length === 0) return null;

    const menuItems = action.map((item, index) => ({
      key: index,
      label: item.name || `Action ${index + 1}`,
      onClick: () => onAction?.(item)
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={loading}
      >
        <Button icon={<SettingOutlined />}>
          Actions
        </Button>
      </Dropdown>
    );
  };

  // Renderizar dropdown de relaciones
  const renderRelateDropdown = () => {
    if (!relate || relate.length === 0) return null;

    const menuItems = relate.map((item, index) => ({
      key: index,
      label: item.name || `Relate ${index + 1}`,
      onClick: () => onRelate?.(item)
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={loading}
      >
        <Button icon={<LinkOutlined />}>
          Relate
        </Button>
      </Dropdown>
    );
  };

  // Renderizar dropdown de impresión
  const renderPrintDropdown = () => {
    if (!print || print.length === 0) return null;

    const menuItems = print.map((item, index) => ({
      key: index,
      label: item.name || `Print ${index + 1}`,
      onClick: () => onPrint?.(item)
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={loading}
      >
        <Button icon={<PrinterOutlined />}>
          Print
        </Button>
      </Dropdown>
    );
  };

  // Renderizar botón de email
  const renderEmailButton = () => {
    if (!emails || emails.length === 0) return null;

    return (
      <Tooltip title="Enviar por email">
        <Button 
          icon={<MailOutlined />} 
          onClick={() => onEmail?.(emails[0])}
          disabled={loading}
        />
      </Tooltip>
    );
  };

  return (
    <div style={{
      background: '#267f82',
      padding: '8px 12px',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      minWidth: 'fit-content'
    }}>
      {/* Primera fila - Navegación y acciones principales */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {renderNavigationButtons()}
        {renderActionButtons()}
        {renderAttachmentButtons()}
      </div>

      {/* Segunda fila - Acciones secundarias */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {renderActionsDropdown()}
        {renderRelateDropdown()}
        {renderPrintDropdown()}
        {renderEmailButton()}
      </div>
    </div>
  );
};

export default Toolbar;

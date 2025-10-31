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
  isDirty = false, // Whether there are unsaved changes
  isNativeForm = false, // Whether this is a native form (not converted from tree)
  hasSelectedRecord = false // Whether a record is selected (for email button)
}) => {
  if (!toolbarInfo) {
    return null;
  }

  const { action = [], relate = [], print = [], emails = [] } = toolbarInfo;

  const disabledVisualStyle = { opacity: 0.35, filter: 'grayscale(60%)', cursor: 'not-allowed' };

  // Renderizar botones de navegación
  const renderNavigationButtons = () => (
    <Space.Compact>
      <Tooltip title={viewType === 'form' ? 'Switch to list view' : 'Switch view'}>
        <Button 
          icon={<SwapOutlined />} 
          onClick={onSwitchView}
          disabled={loading || viewType === 'tree' || isNativeForm}
          style={(loading || viewType === 'tree' || isNativeForm) ? disabledVisualStyle : undefined}
          type={isDirty ? 'primary' : 'default'}
        />
      </Tooltip>
      <Tooltip title="Previous">
        <Button 
          icon={<LeftOutlined />} 
          onClick={() => onNavigate?.('previous')}
          disabled={loading || currentRecord <= 1}
          style={(loading || currentRecord <= 1) ? disabledVisualStyle : undefined}
        />
      </Tooltip>
      <InputNumber
        value={currentRecord}
        min={1}
        max={totalRecords}
        controls={false}
        style={{ width: 60, textAlign: 'center', ...(loading ? disabledVisualStyle : {}) }}
        onChange={(value) => onNavigate?.('goto', value)}
        disabled={loading}
      />
      <Tooltip title="Next">
        <Button 
          icon={<RightOutlined />} 
          onClick={() => onNavigate?.('next')}
          disabled={loading || currentRecord >= totalRecords}
          style={(loading || currentRecord >= totalRecords) ? disabledVisualStyle : undefined}
        />
      </Tooltip>
    </Space.Compact>
  );

  // Renderizar botones de acción CRUD
  const renderActionButtons = () => (
    <Space.Compact>
      <Tooltip title="Create new">
        <Button 
          icon={<PlusOutlined />} 
          onClick={onCreate}
          disabled={loading || (isNativeForm || (viewType === 'form' && !isNativeForm))}
          style={(loading || (isNativeForm || (viewType === 'form' && !isNativeForm))) ? disabledVisualStyle : undefined}
        />
      </Tooltip>
      <Tooltip title="Save">
        <Button 
          icon={<SaveOutlined />} 
          onClick={onSave}
          disabled={loading || (isNativeForm || (viewType === 'tree'))}
          style={(loading || (isNativeForm || (viewType === 'tree'))) ? disabledVisualStyle : undefined}
        />
      </Tooltip>
      <Tooltip title="Refresh">
        <Button 
          icon={<ReloadOutlined />} 
          onClick={onRefresh}
          disabled={loading}
          style={loading ? disabledVisualStyle : undefined}
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
          style={loading ? disabledVisualStyle : undefined}
        />
      </Tooltip>
      <Tooltip title="Comentarios">
        <Button 
          icon={<CommentOutlined />} 
          onClick={onComment}
          disabled={loading}
          style={loading ? disabledVisualStyle : undefined}
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
        <Button icon={<SettingOutlined />} disabled={loading} style={loading ? disabledVisualStyle : undefined}>
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
        <Button icon={<LinkOutlined />} disabled={loading} style={loading ? disabledVisualStyle : undefined}>
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
        <Button icon={<PrinterOutlined />} disabled={loading} style={loading ? disabledVisualStyle : undefined}>
          Print
        </Button>
      </Dropdown>
    );
  };

  // Renderizar botón de email
  const renderEmailButton = () => {
    // Always show email button for table views, even if emails array is empty
    // This allows us to handle email functionality manually
    if (viewType !== 'tree') return null;

    return (
      <Tooltip title={hasSelectedRecord ? "Enviar por email" : "Selecciona un registro para enviar email"}>
        <Button 
          icon={<MailOutlined />} 
          onClick={() => onEmail?.()}
          disabled={loading || !hasSelectedRecord}
          style={(loading || !hasSelectedRecord) ? disabledVisualStyle : undefined}
        />
      </Tooltip>
    );
  };

  return (
    <div style={{
      background: '#f3f4f6',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'row',
      gap: '6px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
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

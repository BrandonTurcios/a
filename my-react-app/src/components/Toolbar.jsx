import React from 'react';
import { Button, Space, InputNumber, Tooltip, Dropdown, Menu } from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  ReloadOutlined,
  PaperclipOutlined,
  CommentOutlined,
  SettingOutlined,
  LinkOutlined,
  PrinterOutlined,
  MailOutlined,
  LeftOutlined,
  RightOutlined,
  SwapOutlined
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
  loading = false
}) => {
  if (!toolbarInfo) {
    return null;
  }

  const { action = [], relate = [], print = [], emails = [] } = toolbarInfo;

  // Renderizar botones de navegación
  const renderNavigationButtons = () => (
    <Space.Compact>
      <Tooltip title="Reordenar">
        <Button 
          icon={<SwapOutlined />} 
          onClick={() => onNavigate?.('reorder')}
          disabled={loading}
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
          icon={<PaperclipOutlined />} 
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
      label: item.name || `Acción ${index + 1}`,
      onClick: () => onAction?.(item)
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={loading}
      >
        <Button icon={<SettingOutlined />}>
          Acciones
        </Button>
      </Dropdown>
    );
  };

  // Renderizar dropdown de relaciones
  const renderRelateDropdown = () => {
    if (!relate || relate.length === 0) return null;

    const menuItems = relate.map((item, index) => ({
      key: index,
      label: item.name || `Relacionar ${index + 1}`,
      onClick: () => onRelate?.(item)
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={loading}
      >
        <Button icon={<LinkOutlined />}>
          Relacionar
        </Button>
      </Dropdown>
    );
  };

  // Renderizar dropdown de impresión
  const renderPrintDropdown = () => {
    if (!print || print.length === 0) return null;

    const menuItems = print.map((item, index) => ({
      key: index,
      label: item.name || `Imprimir ${index + 1}`,
      onClick: () => onPrint?.(item)
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={loading}
      >
        <Button icon={<PrinterOutlined />}>
          Imprimir
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
      padding: '12px 16px',
      borderRadius: '0',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Primera fila - Navegación y acciones principales */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {renderNavigationButtons()}
        {renderActionButtons()}
        {renderAttachmentButtons()}
      </div>

      {/* Segunda fila - Acciones secundarias */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {renderActionsDropdown()}
        {renderRelateDropdown()}
        {renderPrintDropdown()}
        {renderEmailButton()}
      </div>
    </div>
  );
};

export default Toolbar;

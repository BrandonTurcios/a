import React, { useMemo, useRef, useState } from 'react';
import { Button, Space, InputNumber, Tooltip, Dropdown, Modal, List, Typography, Tag, message, Upload, Image } from 'antd';
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
  FileOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined
} from '@ant-design/icons';
import trytonService from '../services/trytonService';

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
  hasSelectedRecord = false, // Whether a record is selected (for email button)
  contextModel = null,
  contextId = null
}) => {
  if (!toolbarInfo) {
    return null;
  }

  const { action = [], relate = [], print = [], emails = [] } = toolbarInfo;

  const disabledVisualStyle = { opacity: 0.35, filter: 'grayscale(60%)', cursor: 'not-allowed' };

  // Attachments state
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  const resourceKey = useMemo(() => {
    if (!contextModel || !contextId) return null;
    return `${contextModel},${contextId}`;
  }, [contextModel, contextId]);

  const fetchAttachments = async () => {
    if (!resourceKey) {
      message.warning('No record selected');
      return;
    }
    try {
      setAttachmentsLoading(true);
      const ids = await trytonService.searchAttachments(resourceKey);
      if (!ids || ids.length === 0) {
        setAttachments([]);
        return;
      }
      const list = await trytonService.readAttachments(ids);
      setAttachments(list || []);
    } catch (e) {
      console.error(e);
      message.error('Failed to load attachments');
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleManageAttachments = async () => {
    await fetchAttachments();
    setAttachmentsOpen(true);
  };

  const handleDownloadAttachment = async (attachmentId, name) => {
    try {
      const data = await trytonService.readAttachmentData([attachmentId]);
      const base64 = data?.[0]?.data?.base64;
      if (!base64) throw new Error('No data');
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name || 'attachment';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      message.error('Download failed');
    }
  };

  const handlePreviewAttachment = async (attachmentId) => {
    try {
      const data = await trytonService.readAttachmentData([attachmentId]);
      const item = data?.[0];
      if (!item?.data?.base64) throw new Error('No data');
      setPreviewItem(item);
      setPreviewOpen(true);
    } catch (e) {
      console.error(e);
      message.error('Preview failed');
    }
  };

  const handleQuickPreview = async () => {
    if (!resourceKey) {
      message.warning('No record selected');
      return;
    }
    const ids = await trytonService.searchAttachments(resourceKey);
    if (!ids?.length) {
      message.info('No attachments');
      return;
    }
    await handlePreviewAttachment(ids[0]);
  };

  const handleAddAttachment = () => {
    if (!resourceKey) {
      message.warning('No record selected');
      return;
    }
    (async () => {
      try {
        // Optional pre-read to mimic flow: read one attachment with size context
        const ids = await trytonService.searchAttachments(resourceKey);
        if (ids?.length) {
          await trytonService.readAttachments([ids[0]]);
        }
        // Get defaults before creating
        await trytonService.getAttachmentDefaults();
      } catch (e) {
        // Non-fatal
        console.warn('Pre-add preparation failed:', e?.message || e);
      } finally {
        fileInputRef.current?.click();
      }
    })();
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      await trytonService.createAttachment({
        name: file.name,
        resource: resourceKey,
        dataBase64: base64,
      });
      message.success('Attachment added');
      // Refresh list if modal open
      if (attachmentsOpen) await fetchAttachments();
    } catch (err) {
      console.error(err);
      message.error('Failed to add attachment');
    } finally {
      e.target.value = '';
      // Refresh after add regardless of modal state
      await fetchAttachments();
    }
  };

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

  // Attachments dropdown (Add, Manage, Preview) + Comments button
  const renderAttachmentDropdown = () => {
    const disabled = loading || !resourceKey;
    const items = [
      { key: 'add', label: 'Add', icon: <UploadOutlined />, onClick: handleAddAttachment },
      { key: 'manage', label: 'Manage', icon: <SettingOutlined />, onClick: handleManageAttachments },
      { key: 'preview', label: 'Preview', icon: <EyeOutlined />, onClick: handleQuickPreview }
    ];
    return (
      <Space.Compact>
        <Dropdown menu={{ items }} trigger={['click']} disabled={loading}>
          <Button icon={<FileOutlined />} disabled={disabled} style={disabled ? disabledVisualStyle : undefined}>
            Attachments
          </Button>
        </Dropdown>
        <Tooltip title="Comentarios">
          <Button 
            icon={<CommentOutlined />} 
            onClick={onComment}
            disabled={loading}
            style={loading ? disabledVisualStyle : undefined}
          />
        </Tooltip>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={onFileChosen} />
      </Space.Compact>
    );
  };

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
    <>
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
        {renderAttachmentDropdown()}
      </div>

      {/* Segunda fila - Acciones secundarias */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {renderActionsDropdown()}
        {renderRelateDropdown()}
        {renderPrintDropdown()}
        {renderEmailButton()}
      </div>
    </div>
    {/* Manage Attachments Modal */}
    <Modal
      open={attachmentsOpen}
      title="Manage Attachments"
      onCancel={async () => { setAttachmentsOpen(false); await fetchAttachments(); }}
      footer={null}
      width={720}
    >
      <List
        loading={attachmentsLoading}
        dataSource={attachments}
        rowKey={(it) => it.id}
        renderItem={(it) => (
          <List.Item
            actions={[
              <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownloadAttachment(it.id, it.name)}>Download</Button>,
              <Button key="preview" icon={<EyeOutlined />} onClick={() => handlePreviewAttachment(it.id)}>Preview</Button>,
            ]}
          >
            <List.Item.Meta
              title={<Typography.Text>{it.name}</Typography.Text>}
              description={
                <Space size={8} wrap>
                  <Tag>{it['type:string'] || it.type}</Tag>
                  {typeof it.data === 'number' ? <Tag color="blue">{`${(it.data/1024).toFixed(1)} KB`}</Tag> : null}
                  {it.last_user ? <Tag color="default">{it.last_user}</Tag> : null}
                  {it.last_modification ? <Tag color="default">{new Date(it.last_modification.year, (it.last_modification.month||1)-1, it.last_modification.day || 1).toLocaleDateString()}</Tag> : null}
                  {it['resource.rec_name'] ? <Tag color="purple">{it['resource.rec_name']}</Tag> : null}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Modal>

    {/* Preview Modal */}
    <Modal
      open={previewOpen}
      title={previewItem?.name || 'Preview'}
      onCancel={() => setPreviewOpen(false)}
      footer={null}
      width={900}
    >
      {previewItem?.data?.base64 ? (
        <Image
          src={`data:application/octet-stream;base64,${previewItem.data.base64}`}
          alt={previewItem?.name}
          style={{ maxHeight: '70vh', objectFit: 'contain' }}
        />
      ) : (
        <Typography.Text>No preview available.</Typography.Text>
      )}
    </Modal>
    </>
  );
};

export default Toolbar;

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Space, InputNumber, Tooltip, Dropdown, Modal, List, Typography, Tag, message, Upload, Image, Input, Checkbox, Badge, Popconfirm } from 'antd';
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
  UploadOutlined,
  CloseOutlined,
  FileTextOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import trytonService from '../services/trytonService';
import { colors } from '../config/colors';

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
  contextId = null,
  openAttachmentsModal = false, // Flag para abrir modal de attachments desde fuera
  openNotesModal = false // Flag para abrir modal de notes desde fuera
}) => {
  const { t } = useTranslation();

  if (!toolbarInfo) {
    return null;
  }

  const { action = [], relate = [], print = [], emails = [] } = toolbarInfo;

  const disabledVisualStyle = { opacity: 0.35, filter: 'grayscale(60%)', cursor: 'not-allowed' };

  const withDisabledStyle = (style, condition) =>
    condition ? { ...style, ...disabledVisualStyle } : style;

  const primaryButtonStyle = {
    background: 'var(--color-primary-600)',
    borderColor: 'var(--color-primary-600)',
    color: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 18px rgba(1, 118, 143, 0.25)'
  };

  const secondaryButtonStyle = {
    ...primaryButtonStyle,
    background: 'var(--color-secondary-600)',
    borderColor: 'var(--color-secondary-600)'
  };

  const neutralButtonStyle = {
    background: 'var(--color-neutral-50)',
    borderColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-800)',
    borderRadius: '12px',
    boxShadow: '0 6px 14px rgba(1, 118, 143, 0.12)'
  };

  const toolbarWrapperStyles = {
    padding: '3px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, var(--color-primary-700), var(--color-secondary-600))',
    boxShadow: '0 18px 28px rgba(1, 68, 82, 0.25)',
    border: '1px solid var(--color-primary-200)',
    minWidth: 'fit-content'
  };

  const toolbarInnerStyles = {
    background: 'var(--color-card-background)',
    borderRadius: '16px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    flexWrap: 'wrap'
  };

  const toolbarSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  };

  // Attachments state
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(-1);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // Notes state
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteMessage, setNewNoteMessage] = useState('');
  const [newNoteUnread, setNewNoteUnread] = useState(true);
  const [selectedNotes, setSelectedNotes] = useState([]);

  const resourceKey = useMemo(() => {
    if (!contextModel || !contextId) return null;
    return `${contextModel},${contextId}`;
  }, [contextModel, contextId]);

  const fetchAttachments = async () => {
    if (!resourceKey) {
      message.warning(t('toolbar.noRecordSelected'));
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
      message.error(t('errors.failedLoadAttachments'));
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleManageAttachments = async () => {
    await fetchAttachments();
    setAttachmentsOpen(true);
  };

  const handleCloseAttachmentsModal = async () => {
    setAttachmentsOpen(false);
    setSelectedAttachments([]);
    await fetchAttachments();
  };

  const handleDeleteAttachments = async () => {
    if (!selectedAttachments || selectedAttachments.length === 0) {
      message.warning(t('toolbar.noAttachmentsSelected'));
      return;
    }
    try {
      // Build timestamp map from selected attachments
      const timestampMap = {};
      selectedAttachments.forEach(attachmentId => {
        const attachment = attachments.find(a => a.id === attachmentId);
        if (attachment?._timestamp) {
          timestampMap[attachmentId] = attachment._timestamp;
        }
      });
      
      // Delete all selected attachments in one call
      await trytonService.deleteAttachment(selectedAttachments, timestampMap);
      message.success(`${selectedAttachments.length} ${t('toolbar.attachmentsDeleted')}`);
      setSelectedAttachments([]);
      await fetchAttachments();
    } catch (e) {
      console.error(e);
      message.error(t('errors.failedDeleteAttachments'));
    }
  };

  const handleAttachmentSelect = (attachmentId, checked) => {
    if (checked) {
      setSelectedAttachments([...selectedAttachments, attachmentId]);
    } else {
      setSelectedAttachments(selectedAttachments.filter(id => id !== attachmentId));
    }
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
      message.error(t('errors.downloadFailed'));
    }
  };

  const handlePreviewAttachment = async (attachmentId, indexHint = null) => {
    try {
      const data = await trytonService.readAttachmentData([attachmentId], { preview: true });
      const item = data?.[0];
      if (!item?.data?.base64) throw new Error('No data');
      setPreviewItem(item);
      // resolve index for navigation
      if (indexHint !== null && indexHint !== undefined) {
        setCurrentPreviewIndex(indexHint);
      } else {
        const idx = attachments.findIndex((a) => a.id === attachmentId);
        setCurrentPreviewIndex(idx);
      }
      setPreviewOpen(true);
    } catch (e) {
      console.error(e);
      message.error(t('errors.previewFailed'));
    }
  };

  const handleQuickPreview = async () => {
    if (!resourceKey) {
      message.warning(t('toolbar.noRecordSelected'));
      return;
    }
    // Ensure attachments list is loaded so preview modal can navigate
    let ids = [];
    try {
      setAttachmentsLoading(true);
      ids = await trytonService.searchAttachments(resourceKey);
      if (ids?.length) {
        const list = await trytonService.readAttachments(ids);
        setAttachments(list || []);
      } else {
        setAttachments([]);
      }
    } catch (e) {
      console.error(e);
      message.error(t('errors.failedLoadAttachments'));
      return;
    } finally {
      setAttachmentsLoading(false);
    }
    if (!ids?.length) {
      message.info(t('toolbar.noAttachments'));
      return;
    }
    await handlePreviewAttachment(ids[0], 0);
  };

  const handleAddAttachment = () => {
    if (!resourceKey) {
      message.warning(t('toolbar.noRecordSelected'));
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
      message.success(t('toolbar.attachmentAdded'));
      // Refresh list if modal open
      if (attachmentsOpen) await fetchAttachments();
    } catch (err) {
      console.error(err);
      message.error(t('errors.failedAddAttachment'));
    } finally {
      e.target.value = '';
      // Refresh after add regardless of modal state
      await fetchAttachments();
    }
  };

  // Notes handlers
  const fetchNotes = async () => {
    if (!resourceKey) {
      message.warning(t('toolbar.noRecordSelected'));
      return;
    }
    try {
      setNotesLoading(true);
      const ids = await trytonService.searchNotes(resourceKey);
      if (!ids || ids.length === 0) {
        setNotes([]);
        return;
      }
      const list = await trytonService.readNotes(ids);
      setNotes(list || []);
    } catch (e) {
      console.error(e);
      message.error(t('errors.failedLoadNotes'));
    } finally {
      setNotesLoading(false);
    }
  };

  const handleManageNotes = async () => {
    await fetchNotes();
    setNotesOpen(true);
  };

  const handleSaveNote = async () => {
    if (!resourceKey || !newNoteMessage.trim()) {
      message.warning(t('toolbar.enterMessage'));
      return;
    }
    try {
      await trytonService.createNote({
        message: newNoteMessage,
        resource: resourceKey,
        unread: newNoteUnread
      });
      message.success(t('toolbar.noteCreated'));
      setNewNoteMessage('');
      setNewNoteUnread(true);
      await fetchNotes();
    } catch (e) {
      console.error(e);
      message.error(t('errors.failedCreateNote'));
    }
  };

  const handleCloseNotesModal = async () => {
    setNotesOpen(false);
    setNewNoteMessage('');
    setNewNoteUnread(true);
    setSelectedNotes([]);
    await fetchNotes();
  };

  const handleDeleteNotes = async () => {
    if (!selectedNotes || selectedNotes.length === 0) {
      message.warning(t('toolbar.noNotesSelected'));
      return;
    }
    try {
      // Build timestamp map from selected notes
      const timestampMap = {};
      selectedNotes.forEach(noteId => {
        const note = notes.find(n => n.id === noteId);
        if (note?._timestamp) {
          timestampMap[noteId] = note._timestamp;
        }
      });
      
      // Delete all selected notes in one call
      await trytonService.deleteNote(selectedNotes, timestampMap);
      message.success(`${selectedNotes.length} ${t('toolbar.notesDeleted')}`);
      setSelectedNotes([]);
      await fetchNotes();
    } catch (e) {
      console.error(e);
      message.error(t('errors.failedDeleteNotes'));
    }
  };

  const handleNoteSelect = (noteId, checked) => {
    if (checked) {
      setSelectedNotes([...selectedNotes, noteId]);
    } else {
      setSelectedNotes(selectedNotes.filter(id => id !== noteId));
    }
  };

  // Load counts when resourceKey changes
  useEffect(() => {
    const fetchAttachmentsCount = async () => {
      if (!resourceKey) {
        return;
      }
      try {
        const ids = await trytonService.searchAttachments(resourceKey);
        if (!ids || ids.length === 0) {
          setAttachments([]);
          return;
        }
        // Update attachments list if modal is not open to avoid unnecessary updates
        if (!attachmentsOpen) {
          const list = await trytonService.readAttachments(ids);
          setAttachments(list || []);
        }
      } catch (e) {
        console.error('Failed to load attachments count:', e);
      }
    };

    const fetchNotesCount = async () => {
      if (!resourceKey) {
        return;
      }
      try {
        const ids = await trytonService.searchNotes(resourceKey);
        if (!ids || ids.length === 0) {
          setNotes([]);
          return;
        }
        // Update notes list if modal is not open to avoid unnecessary updates
        if (!notesOpen) {
          const list = await trytonService.readNotes(ids);
          setNotes(list || []);
        }
      } catch (e) {
        console.error('Failed to load notes count:', e);
      }
    };

    if (resourceKey) {
      fetchAttachmentsCount();
      fetchNotesCount();
    } else {
      setAttachments([]);
      setNotes([]);
    }
  }, [resourceKey, attachmentsOpen, notesOpen]);

  // Abrir modales cuando se solicita desde fuera (menú contextual)
  // Estos efectos deben estar después de las definiciones de handleManageAttachments y handleManageNotes
  useEffect(() => {
    if (openAttachmentsModal && resourceKey && !attachmentsOpen) {
      handleManageAttachments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAttachmentsModal, resourceKey, attachmentsOpen]);

  useEffect(() => {
    if (openNotesModal && resourceKey && !notesOpen) {
      handleManageNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNotesModal, resourceKey, notesOpen]);

  // Renderizar botones de navegación
  const renderNavigationButtons = () => (
    <Space.Compact>
      <Tooltip title={viewType === 'form' ? t('toolbar.switchToListView') : t('toolbar.switchView')}>
        <Button
          icon={<SwapOutlined />}
          onClick={onSwitchView}
          disabled={loading || viewType === 'tree' || isNativeForm}
          style={withDisabledStyle(neutralButtonStyle, (loading || viewType === 'tree' || isNativeForm))}
          type={isDirty ? 'primary' : 'default'}
        />
      </Tooltip>
      <Tooltip title={t('toolbar.previous')}>
        <Button
          icon={<LeftOutlined />}
          onClick={() => onNavigate?.('previous')}
          disabled={loading || currentRecord <= 1}
          style={withDisabledStyle(neutralButtonStyle, (loading || currentRecord <= 1))}
        />
      </Tooltip>
      <InputNumber
        value={currentRecord}
        min={1}
        max={totalRecords}
        controls={false}
        style={{
          width: 60,
          textAlign: 'center',
          borderRadius: '10px',
          border: '1px solid var(--color-primary-100)',
          background: 'var(--color-neutral-50)',
          color: 'var(--color-primary-800)',
          ...(loading ? disabledVisualStyle : {})
        }}
        onChange={(value) => onNavigate?.('goto', value)}
        disabled={loading}
      />
      <Tooltip title={t('toolbar.next')}>
        <Button
          icon={<RightOutlined />}
          onClick={() => onNavigate?.('next')}
          disabled={loading || currentRecord >= totalRecords}
          style={withDisabledStyle(neutralButtonStyle, (loading || currentRecord >= totalRecords))}
        />
      </Tooltip>
    </Space.Compact>
  );

  // Renderizar botones de acción CRUD
  const renderActionButtons = () => (
    <Space.Compact>
      <Tooltip title={t('toolbar.createNew')}>
        <Button
          icon={<PlusOutlined />}
          onClick={onCreate}
          disabled={loading || (isNativeForm || (viewType === 'form' && !isNativeForm))}
          style={withDisabledStyle(secondaryButtonStyle, (loading || (isNativeForm || (viewType === 'form' && !isNativeForm))))}
        />
      </Tooltip>
      <Tooltip title={t('toolbar.save')}>
        <Button
          icon={<SaveOutlined />}
          onClick={onSave}
          disabled={loading || (isNativeForm || (viewType === 'tree'))}
          style={withDisabledStyle(primaryButtonStyle, (loading || (isNativeForm || (viewType === 'tree'))))}
        />
      </Tooltip>
      <Tooltip title={t('toolbar.refresh')}>
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          disabled={loading}
          style={withDisabledStyle(neutralButtonStyle, loading)}
        />
      </Tooltip>
    </Space.Compact>
  );

  // Attachments dropdown (Add, Manage, Preview) + Comments button
  // Solo mostrar en vista de formulario (no en tabla)
  const renderAttachmentDropdown = () => {
    // Ocultar en vista de tabla - estos botones están en el menú contextual
    if (viewType === 'tree') return null;

    const disabled = loading || !resourceKey;
    const items = [
      { key: 'add', label: t('common.add'), icon: <UploadOutlined />, onClick: handleAddAttachment },
      { key: 'manage', label: t('toolbar.manage'), icon: <SettingOutlined />, onClick: handleManageAttachments },
      { key: 'preview', label: t('toolbar.preview'), icon: <EyeOutlined />, onClick: handleQuickPreview }
    ];
    const attachmentsCount = attachments.length;
    const notesCount = notes.length;
    const unreadNotesCount = notes.filter(n => n.unread).length;
    const notesBadgeText = notesCount > 0 ? `${unreadNotesCount}/${notesCount}` : null;
    
    return (
      <Space.Compact>
        <Dropdown menu={{ items }} trigger={['click']} disabled={loading}>
          <Tooltip title={t('toolbar.attachments')}>
            <Badge count={attachmentsCount} size="small" offset={[-12, 8]} style={{ zIndex: 100 }} color={colors.secondary.A500}>
              <Button
                icon={<FileOutlined />}
                disabled={disabled}
                style={withDisabledStyle(neutralButtonStyle, disabled)}
              />
            </Badge>
          </Tooltip>
        </Dropdown>
        <Tooltip title={t('toolbar.note')}>
          <Badge count={notesBadgeText} size="small" offset={[-12, 8]} style={{ zIndex: 100 }} color={colors.secondary.A500}>
            <Button
              icon={<CommentOutlined />}
              onClick={handleManageNotes}
              disabled={loading || !resourceKey}
              style={withDisabledStyle(neutralButtonStyle, (loading || !resourceKey))}
            />
          </Badge>
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
        <Tooltip title={t('common.actions')}>
          <Button icon={<SettingOutlined />} disabled={loading} style={withDisabledStyle(neutralButtonStyle, loading)}>
            {t('common.actions')}
          </Button>
        </Tooltip>
      </Dropdown>
    );
  };

  // Renderizar dropdown de relaciones
  // Solo mostrar en vista de formulario (no en tabla)
  const renderRelateDropdown = () => {
    if (!relate || relate.length === 0) return null;
    // Ocultar en vista de tabla - estos botones están en el menú contextual
    if (viewType === 'tree') return null;

    const isDisabled = loading || !hasSelectedRecord;

    const menuItems = relate.map((item, index) => ({
      key: index,
      label: item.name || `Relate ${index + 1}`,
      onClick: () => onRelate?.(item),
      disabled: isDisabled
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={isDisabled}
      >
        <Tooltip title={t('common.relate')}>
          <Button icon={<LinkOutlined />} disabled={loading} style={withDisabledStyle(neutralButtonStyle, loading)}>
          </Button>
        </Tooltip>
      </Dropdown>
    );
  };

  // Renderizar dropdown de impresión
  // Solo mostrar en vista de formulario (no en tabla)
  const renderPrintDropdown = () => {
    if (!print || print.length === 0) return null;
    // Ocultar en vista de tabla - estos botones están en el menú contextual
    if (viewType === 'tree') return null;

    const isDisabled = loading || !hasSelectedRecord;

    const menuItems = print.map((item, index) => ({
      key: index,
      label: item.name || `Print ${index + 1}`,
      onClick: () => onPrint?.(item),
      disabled: isDisabled
    }));

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={isDisabled}
      >
        <Tooltip title={t('common.print')}>
          <Button icon={<PrinterOutlined />} disabled={loading} style={withDisabledStyle(neutralButtonStyle, loading)} />
        </Tooltip>
      </Dropdown>
    );
  };

  // Renderizar botón de email
  // Ocultar en vista de tabla - este botón está en el menú contextual
  const renderEmailButton = () => {
    // Ocultar en vista de tabla - este botón está en el menú contextual
    if (viewType === 'tree') return null;

    return (
      <Tooltip title={hasSelectedRecord ? t('toolbar.sendEmail') : t('toolbar.selectRecordForEmail')}>
        <Button
          icon={<MailOutlined />}
          onClick={() => onEmail?.()}
          disabled={loading || !hasSelectedRecord}
          style={withDisabledStyle(neutralButtonStyle, (loading || !hasSelectedRecord))}
        />
      </Tooltip>
    );
  };

  return (
    <>
    <div style={toolbarWrapperStyles}>
      <div style={toolbarInnerStyles}>
        {/* Primera fila - Navegación y acciones principales */}
        <div style={toolbarSectionStyle}>
          {renderNavigationButtons()}
          {renderActionButtons()}
          {renderAttachmentDropdown()}
        </div>

        {/* Segunda fila - Acciones secundarias */}
        <div style={toolbarSectionStyle}>
          {renderActionsDropdown()}
          {renderRelateDropdown()}
          {renderPrintDropdown()}
          {renderEmailButton()}
        </div>
      </div>
    </div>
    {/* Manage Attachments Modal */}
    <Modal
      open={attachmentsOpen}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '2px solid var(--color-primary)' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
            A
          </div>
          <div>
            <Typography.Title level={3} style={{ margin: 0, color: 'var(--color-secondary-700)' }}>{t('toolbar.manageAttachments')}</Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: '14px' }}>{t('toolbar.manageAttachmentsSubtitle')}</Typography.Text>
          </div>
        </div>
      }
      onCancel={handleCloseAttachmentsModal}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <Typography.Text>
            {selectedAttachments.length > 0 ? `${selectedAttachments.length} ${t('toolbar.attachmentsSelected')}` : t('toolbar.noAttachmentsSelected')}
          </Typography.Text>
          <Space>
            <Button onClick={handleCloseAttachmentsModal}>{t('common.cancel')}</Button>
            {selectedAttachments.length > 0 && (
              <Popconfirm
                title={t('toolbar.deleteAttachmentsTitle')}
                description={t('toolbar.deleteAttachmentsDesc')}
                onConfirm={handleDeleteAttachments}
                okText={t('common.yes')}
                cancelText={t('common.no')}
                okButtonProps={{ style: { background: 'var(--color-secondary-600)', borderColor: 'var(--color-secondary-600)' } }}
              >
                <Button danger>{t('common.delete')}</Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      }
      width={720}
      centered
      styles={{
        content: { borderRadius: '16px' }
      }}
    >
      <List
        loading={attachmentsLoading}
        dataSource={attachments}
        rowKey={(it) => it.id}
        renderItem={(it) => (
          <List.Item
            actions={[
              <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownloadAttachment(it.id, it.name)}>{t('toolbar.download')}</Button>,
              <Button key="preview" icon={<EyeOutlined />} onClick={() => handlePreviewAttachment(it.id, attachments.findIndex(a => a.id === it.id))}>{t('toolbar.preview')}</Button>,
            ]}
          >
            <Checkbox
              checked={selectedAttachments.includes(it.id)}
              onChange={(e) => handleAttachmentSelect(it.id, e.target.checked)}
              style={{ marginRight: '12px' }}
            />
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
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', width: '100%', paddingRight: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Button 
              type="text" 
              icon={<LeftOutlined />} 
              disabled={currentPreviewIndex <= 0} 
              onClick={async () => {
                if (currentPreviewIndex > 0) {
                  const prev = attachments[currentPreviewIndex - 1];
                  await handlePreviewAttachment(prev.id, currentPreviewIndex - 1);
                }
              }}
              style={{ padding: '4px 8px' }}
            />
            <span style={{ flex: 1, textAlign: 'center' }}>
              {previewItem?.name || t('toolbar.preview')}{attachments?.length ? ` (${currentPreviewIndex + 1}/${attachments.length})` : ''}
            </span>
            <Button 
              type="text" 
              icon={<RightOutlined />} 
              disabled={!(attachments && currentPreviewIndex < attachments.length - 1)} 
              onClick={async () => {
                if (attachments && currentPreviewIndex < attachments.length - 1) {
                  const next = attachments[currentPreviewIndex + 1];
                  await handlePreviewAttachment(next.id, currentPreviewIndex + 1);
                }
              }}
              style={{ padding: '4px 8px', marginRight: '24px' }}
            />
          </div>
        </div>
      }
      onCancel={() => setPreviewOpen(false)}
      footer={null}
      width={900}
      zIndex={4000}
      maskStyle={{ zIndex: 3999 }}
      getContainer={document.body}
      closeIcon={
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          marginRight: '-12px',
          marginTop: '-12px',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.06)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <CloseOutlined style={{ fontSize: '16px' }} />
        </span>
      }
    >
      {(() => {
        if (!previewItem?.data?.base64) {
          return <Typography.Text>{t('toolbar.noPreviewAvailable')}</Typography.Text>;
        }
        const name = previewItem?.name || '';
        const ext = name.split('.').pop()?.toLowerCase();
        const imageExts = ['png','jpg','jpeg','gif','bmp','webp','svg'];
        if (imageExts.includes(ext)) {
          const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          return (
            <Image
              src={`data:${mime};base64,${previewItem.data.base64}`}
              alt={name}
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
            />
          );
        }
        const textExts = ['txt','csv','log','json','md','xml','yaml','yml'];
        if (textExts.includes(ext)) {
          let decoded = '';
          try {
            decoded = atob(previewItem.data.base64);
          } catch (e) {
            decoded = '[Unable to decode text]';
          }
          return (
            <pre style={{ maxHeight: '70vh', overflow: 'auto', background: 'var(--color-background)', padding: 12, borderRadius: 6 }}>
              {decoded}
            </pre>
          );
        }
        // Fallback: show generic note and offer download via button
        return (
          <div>
            <Typography.Text>{t('toolbar.previewNotSupported')}</Typography.Text>
          </div>
        );
      })()}
    </Modal>

    {/* Manage Notes Modal */}
    <Modal
      open={notesOpen}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '2px solid var(--color-primary)' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
            N
          </div>
          <div>
            <Typography.Title level={3} style={{ margin: 0, color: 'var(--color-secondary-700)' }}>{t('toolbar.manageNotes')}</Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: '14px' }}>{t('toolbar.manageNotesSubtitle')}</Typography.Text>
          </div>
        </div>
      }
      onCancel={handleCloseNotesModal}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <Typography.Text>
            {selectedNotes.length > 0 ? `${selectedNotes.length} ${t('toolbar.notesSelected')}` : t('toolbar.noNotesSelected')}
          </Typography.Text>
          <Space>
            <Button onClick={handleCloseNotesModal}>{t('common.cancel')}</Button>
            {selectedNotes.length > 0 && (
              <Popconfirm
                title={t('toolbar.deleteNotesTitle')}
                description={t('toolbar.deleteNotesDesc')}
                onConfirm={handleDeleteNotes}
                okText={t('common.yes')}
                cancelText={t('common.no')}
                okButtonProps={{ style: { background: 'var(--color-secondary-600)', borderColor: 'var(--color-secondary-600)' } }}
              >
                <Button danger>{t('common.delete')}</Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      }
      width={720}
      centered
      styles={{
        content: { borderRadius: '16px' }
      }}
    >
      {/* New Note Form */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>{t('toolbar.newNote')}</Typography.Text>
        <Input.TextArea
          rows={4}
          placeholder={t('toolbar.enterMessage')}
          value={newNoteMessage}
          onChange={(e) => setNewNoteMessage(e.target.value)}
          style={{ marginBottom: '12px' }}
        />
        <Space style={{ marginBottom: '12px' }}>
          <Checkbox checked={newNoteUnread} onChange={(e) => setNewNoteUnread(e.target.checked)}>
            {t('toolbar.markAsUnread')}
          </Checkbox>
        </Space>
        <Button type="primary" onClick={handleSaveNote} block style={{
          background: 'var(--color-secondary-600)',
          borderColor: 'var(--color-secondary-600)',
          borderRadius: '8px'
        }}>
          {t('toolbar.saveNote')}
        </Button>
      </div>

      {/* Existing Notes List */}
      <List
        loading={notesLoading}
        dataSource={notes}
        rowKey={(it) => it.id}
        renderItem={(it) => (
          <List.Item>
            <Checkbox
              checked={selectedNotes.includes(it.id)}
              onChange={(e) => handleNoteSelect(it.id, e.target.checked)}
              style={{ marginRight: '12px' }}
            />
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag color={it.unread ? "orange" : "default"}>
                    {it.unread ? t('toolbar.unread') : t('toolbar.read')}
                  </Tag>
                  <Typography.Text strong>{it['resource.rec_name'] || t('toolbar.unknownResource')}</Typography.Text>
                </div>
              }
              description={
                <div>
                  <Typography.Paragraph style={{ margin: '8px 0' }}>
                    {it.message_wrapped || t('toolbar.noMessage')}
                  </Typography.Paragraph>
                  <Space size={8} wrap>
                    {it.last_user ? <Tag color="default">{t('toolbar.by')} {it.last_user}</Tag> : null}
                    {it.last_modification ? (
                      <Tag color="default">
                        {new Date(it.last_modification.year, (it.last_modification.month || 1) - 1, it.last_modification.day || 1).toLocaleDateString()} {' '}
                        {it.last_modification.hour}:{String(it.last_modification.minute || 0).padStart(2, '0')}
                      </Tag>
                    ) : null}
                  </Space>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
    </>
  );
};

export default Toolbar;

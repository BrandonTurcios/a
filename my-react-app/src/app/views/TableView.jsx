import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import TrytonTable from '../../components/TrytonTable';
import Toolbar from '../../components/Toolbar';

const { Title } = Typography;

const TableView = ({ tableInfo, selectedMenuInfo, loadingContent, formDirty, toolbarHandlers, onRecordClick, selectedRecord, onRecordSelect }) => {
  const { t } = useTranslation();
  const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
  const [openNotesModal, setOpenNotesModal] = useState(false);

  const handleRowClick = useCallback((record) => {
    console.log('🖱️ Row clicked:', record);
    if (onRecordClick && record.id) {
      onRecordClick(record.id, record);
    }
  }, [onRecordClick]);

  const handleRowDoubleClick = useCallback((record) => {
    console.log('🖱️ Row double clicked:', record);
    if (onRecordClick && record.id) {
      onRecordClick(record.id, record);
    }
  }, [onRecordClick]);

  const handleRowSelect = useCallback((record, isSelected) => {
    console.log('✅ Row selected:', record, isSelected);
    if (onRecordSelect) {
      onRecordSelect(record, isSelected);
    }
  }, [onRecordSelect]);

  // Memo para evitar crear nuevas referencias que causen recargas
  const tableDomain = React.useMemo(() => tableInfo.domain || [], [tableInfo.domain]);
  const tableDataProp = React.useMemo(() => tableInfo.filtered ? tableInfo : null, [tableInfo.filtered, tableInfo]);

  // Debug: Log toolbar info
  console.log('🔧 TableView - toolbarInfo:', selectedMenuInfo?.toolbarInfo);
  console.log('🔧 TableView - selectedRecord:', selectedRecord);

  const title = React.useMemo(() => {
    const rawTitle = selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Table';
    if (!rawTitle) return 'Table';
    if (rawTitle.includes('/')) {
      return rawTitle
        .split('/')
        .map((part) => part.trim())
        .join('  →  ');
    }
    if (rawTitle.includes('->')) {
      return rawTitle
        .split('->')
        .map((part) => part.trim())
        .join('  →  ');
    }
    return rawTitle;
  }, [selectedMenuInfo?.actionName, selectedMenuInfo?.menuItem?.name]);
  const containerStyles = {
    background: 'var(--color-neutral-50)',
    borderRadius: '28px',
    border: '1px solid var(--color-neutral-200)',
    padding: '28px',
    minHeight: 'calc(100vh - 96px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  };

  return (
    <div style={{
      padding: '32px',
      background: 'var(--color-background)',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={containerStyles}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
              <Title
                level={2}
                style={{
                  margin: 0,
                  fontSize: '38px',
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: 'var(--color-primary-900)',
                  background: 'linear-gradient(120deg, var(--color-primary-800), #012f44)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 6px 18px rgba(1, 76, 107, 0.15)'
                }}
              >
                {title}
              </Title>
          </div>

          {/* Toolbar dentro del mismo contenedor */}
          {selectedMenuInfo?.toolbarInfo && (
            <div style={{ flexShrink: 0 }}>
              <Toolbar
                toolbarInfo={selectedMenuInfo.toolbarInfo}
                currentRecord={1}
                totalRecords={1}
                onNavigate={toolbarHandlers.onNavigate}
                onCreate={toolbarHandlers.onCreate}
                onSave={toolbarHandlers.onSave}
                onRefresh={toolbarHandlers.onRefresh}
                onAttach={toolbarHandlers.onAttach}
                onComment={toolbarHandlers.onComment}
                onAction={toolbarHandlers.onAction}
                onRelate={toolbarHandlers.onRelate}
                onPrint={toolbarHandlers.onPrint}
                onEmail={toolbarHandlers.onEmail}
                loading={loadingContent}
                viewType={selectedMenuInfo.viewType}
                onSwitchView={toolbarHandlers.onSwitchView}
                isDirty={false}
                isNativeForm={false}
                hasSelectedRecord={!!selectedRecord}
                contextModel={selectedMenuInfo?.resModel}
                contextId={selectedRecord?.id}
                openAttachmentsModal={openAttachmentsModal}
                openNotesModal={openNotesModal}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <TrytonTable
            model={tableInfo.model}
            viewId={tableInfo.viewId}
            viewType={tableInfo.viewType}
            domain={tableDomain}
            limit={100}
            title={selectedMenuInfo?.actionName}
            onRowClick={handleRowClick}
            onRowDoubleClick={handleRowDoubleClick}
            onRowSelect={handleRowSelect}
            enableRowSelection={true}
            selectedRecord={selectedRecord}
            tableData={tableDataProp}
            filtered={tableInfo.filtered || false}
            onContextMenuAttach={(record) => {
              // Actualizar el registro seleccionado primero
              if (onRecordSelect) {
                onRecordSelect(record, true);
              }
              // Abrir modal de attachments después de un pequeño delay
              setTimeout(() => {
                setOpenAttachmentsModal(true);
                // Resetear el flag después de que el Toolbar lo detecte
                setTimeout(() => setOpenAttachmentsModal(false), 100);
              }, 150);
            }}
            onContextMenuNote={(record) => {
              // Actualizar el registro seleccionado primero
              if (onRecordSelect) {
                onRecordSelect(record, true);
              }
              // Abrir modal de notes después de un pequeño delay
              setTimeout(() => {
                setOpenNotesModal(true);
                // Resetear el flag después de que el Toolbar lo detecte
                setTimeout(() => setOpenNotesModal(false), 100);
              }, 150);
            }}
            onContextMenuRelate={(relateItem, record) => {
              if (onRecordSelect) {
                onRecordSelect(record, true);
              }
              // Pequeño delay para asegurar que el contexto se actualice
              setTimeout(() => {
                toolbarHandlers.onRelate?.(relateItem);
              }, 100);
            }}
            onContextMenuPrint={(printItem, record) => {
              console.log('🖨️ Context menu print triggered:', printItem, 'for record:', record);
              
              // Actualizar el registro seleccionado primero
              if (onRecordSelect) {
                onRecordSelect(record, true);
              }
              
              // Llamar al handler de print con un delay para asegurar que el contexto se actualice
              // El handler de print necesita el selectedRecord actualizado en el estado de Dashboard
              // Usamos requestAnimationFrame + setTimeout para asegurar que el estado se haya actualizado
              requestAnimationFrame(() => {
                setTimeout(() => {
                  if (toolbarHandlers.onPrint) {
                    console.log('🖨️ Calling onPrint handler with:', printItem);
                    toolbarHandlers.onPrint(printItem);
                  } else {
                    console.warn('⚠️ onPrint handler not available');
                  }
                }, 200);
              });
            }}
            onContextMenuEmail={(record) => {
              if (onRecordSelect) {
                onRecordSelect(record, true);
              }
              setTimeout(() => {
                toolbarHandlers.onEmail?.();
              }, 100);
            }}
            toolbarInfo={selectedMenuInfo?.toolbarInfo}
          />
        </div>
      </div>
    </div>
  );
};

export default TableView;

import React, { useCallback } from 'react';
import { Typography } from 'antd';
import TrytonTable from '../../components/TrytonTable';
import Toolbar from '../../components/Toolbar';

const { Title, Paragraph } = Typography;

const TableView = ({ tableInfo, selectedMenuInfo, loadingContent, formDirty, toolbarHandlers, onRecordClick, selectedRecord, onRecordSelect }) => {

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

  const title = selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Table';
  const subtitle = `${selectedMenuInfo?.resModel || 'Tryton'} · ${tableInfo?.viewType || 'tree'} view`;
  const headerChipBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600
  };

  return (
    <div style={{
      padding: '32px',
      background: 'linear-gradient(180deg, var(--color-primary-50) 0%, var(--color-background) 40%)',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          minWidth: '320px',
          padding: '24px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-secondary-50))',
          border: '1px solid var(--color-primary-100)',
          boxShadow: '0 12px 30px rgba(1, 118, 143, 0.08)'
        }}>
          <Title level={2} style={{ margin: '0 0 6px', color: 'var(--color-primary-900)' }}>
            {title}
          </Title>
          <Paragraph style={{ color: 'var(--color-primary-700)', margin: 0 }}>
            {subtitle}
          </Paragraph>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px' }}>
            {selectedMenuInfo?.resModel && (
              <span style={{
                ...headerChipBase,
                background: 'var(--color-primary-100)',
                color: 'var(--color-primary-800)'
              }}>
                {selectedMenuInfo.resModel}
              </span>
            )}
            {tableInfo?.domain?.length > 0 && (
              <span style={{
                ...headerChipBase,
                background: 'var(--color-secondary-100)',
                color: 'var(--color-secondary-800)'
              }}>
                {tableInfo.domain.length} filtros activos
              </span>
            )}
            {tableInfo?.fieldsView?.fields && (
              <span style={{
                ...headerChipBase,
                background: 'var(--color-neutral-200)',
                color: 'var(--color-neutral-800)'
              }}>
                {Object.keys(tableInfo.fieldsView.fields).length} columnas
              </span>
            )}
          </div>
        </div>

        {/* Toolbar al lado del título */}
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
            />
          </div>
        )}
      </div>

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
      />
    </div>
  );
};

export default TableView;

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

  return (
    <div style={{
      padding: '24px',
      background: 'var(--color-background)',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <Title level={2} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Table'}
          </Title>
          <Paragraph style={{ color: 'var(--color-text-secondary)', margin: '8px 0 0 0' }}>
            {selectedMenuInfo?.resModel} - Table view
          </Paragraph>
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

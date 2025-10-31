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

  // Debug: Log toolbar info
  console.log('🔧 TableView - toolbarInfo:', selectedMenuInfo?.toolbarInfo);
  console.log('🔧 TableView - selectedRecord:', selectedRecord);

  return (
    <div style={{
      padding: '24px',
      background: '#F8F9FA',
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
          <Title level={2} style={{ margin: 0, color: '#333333' }}>
            {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Table'}
          </Title>
          <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
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
        domain={tableInfo.domain || []}
        limit={100}
        title={selectedMenuInfo?.actionName}
        onRowClick={handleRowClick}
        onRowDoubleClick={handleRowDoubleClick}
        onRowSelect={handleRowSelect}
        enableRowSelection={true}
        selectedRecord={selectedRecord}
        tableData={tableInfo.filtered ? tableInfo : null}
        filtered={tableInfo.filtered || false}
      />
    </div>
  );
};

export default TableView;

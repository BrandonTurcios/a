import React, { useRef } from 'react';
import { Typography } from 'antd';
import TrytonForm from '../../components/TrytonForm';
import Toolbar from '../../components/Toolbar';

const { Title, Paragraph } = Typography;

const FormView = ({ formInfo, selectedMenuInfo, loadingContent, formDirty, onFormChange, toolbarHandlers, formRef }) => {
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
            {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Form'}
          </Title>
          <Paragraph style={{ color: 'var(--color-text-secondary)', margin: '8px 0 0 0' }}>
            {selectedMenuInfo?.resModel} - {formInfo?.isNew ? 'New record' : 'Form view'}
          </Paragraph>
        </div>

        {/* Toolbar al lado del título */}
        {selectedMenuInfo?.toolbarInfo && (
          <div style={{ flexShrink: 0 }}>
            <Toolbar
              toolbarInfo={selectedMenuInfo.toolbarInfo}
              currentRecord={formInfo?.recordData?.id || 1}
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
              isDirty={formDirty}
              isNativeForm={formInfo?.isNativeForm || false}
              contextModel={formInfo?.model}
              contextId={formInfo?.recordData?.id}
            />
          </div>
        )}
      </div>

      <TrytonForm
        ref={formRef}
        model={formInfo.model}
        viewId={formInfo.viewId}
        viewType={selectedMenuInfo.viewType}
        recordId={formInfo.recordData?.id || null}
        recordData={formInfo.recordData}
        fieldsView={formInfo.fieldsView}
        title={selectedMenuInfo?.actionName}
        onFormChange={onFormChange}
        onSave={(values) => console.log('Save:', values)}
        onCancel={() => console.log('Cancel')}
      />
    </div>
  );
};

export default FormView;

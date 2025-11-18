import React from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import TrytonForm from '../../components/TrytonForm';
import Toolbar from '../../components/Toolbar';

const { Title, Paragraph } = Typography;

const FormView = ({ formInfo, selectedMenuInfo, loadingContent, formDirty, onFormChange, toolbarHandlers }) => {
  const { t } = useTranslation();
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
            {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || t('form.view')}
          </Title>
          <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
            {selectedMenuInfo?.resModel} - {formInfo?.isNew ? t('form.newRecordLabel') : t('form.viewLabel')}
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

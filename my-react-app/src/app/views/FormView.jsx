import React from 'react';
import { Typography } from 'antd';
import TrytonForm from '../../components/TrytonForm';
import Toolbar from '../../components/Toolbar';

const { Title } = Typography;

const FormView = ({ formInfo, selectedMenuInfo, loadingContent, formDirty, onFormChange, toolbarHandlers, formRef }) => {
  const formattedTitle = React.useMemo(() => {
    const rawTitle = selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Formulario';
    if (!rawTitle) return 'Formulario';
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


  return (
    <div style={{
      padding: '12px',
      background: 'var(--color-background)',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <Title
            level={2}
            style={{
              margin: 0,
              marginLeft: '8px',
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
            {formattedTitle}
          </Title>
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
              hasSelectedRecord={!!formInfo?.recordData?.id}
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

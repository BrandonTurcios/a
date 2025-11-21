import React from 'react';
import { Typography } from 'antd';
import TrytonForm from '../../components/TrytonForm';
import Toolbar from '../../components/Toolbar';
import { Button } from '../../components/ui/button';

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

  const modelDisplay = React.useMemo(() => {
    const raw = selectedMenuInfo?.resModel;
    if (!raw) return null;
    const cleaned = raw.split('.').pop()?.replace(/_/g, ' ') || raw;
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  }, [selectedMenuInfo?.resModel]);

  const infoChips = React.useMemo(() => {
    const chips = [];
    if (modelDisplay) {
      chips.push({
        key: 'model',
        label: modelDisplay,
        style: {
          borderColor: 'var(--color-secondary-200)',
          background: 'var(--color-secondary-50)',
          color: 'var(--color-secondary-700)'
        }
      });
    }
    chips.push({
      key: 'record',
      label: formInfo?.isNew
        ? 'Nuevo o sin guardar'
        : `Registro ${formInfo?.recordData?.id || ''}`,
      style: {
        borderColor: 'var(--color-primary-200)',
        background: 'var(--color-primary-50)',
        color: 'var(--color-primary-800)'
      }
    });
    if (selectedMenuInfo?.viewType) {
      const viewLabel = selectedMenuInfo.viewType === 'form'
        ? 'Formulario'
        : selectedMenuInfo.viewType;
      chips.push({
        key: 'viewType',
        label: viewLabel,
        style: {
          borderColor: 'var(--color-success-200)',
          background: 'var(--color-success-50)',
          color: 'var(--color-success-700)'
        }
      });
    }
    return chips;
  }, [modelDisplay, formInfo?.isNew, formInfo?.recordData?.id, selectedMenuInfo?.viewType]);

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
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <div style={{ flex: 1 }}>
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
            {formattedTitle}
          </Title>
          {infoChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {infoChips.map((chip) => (
                <Button
                  key={chip.key}
                  variant="outline"
                  size="sm"
                  className="rounded-full font-semibold"
                  style={{
                    borderColor: chip.style.borderColor,
                    background: chip.style.background,
                    color: chip.style.color,
                    height: '34px',
                    padding: '0 18px'
                  }}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          )}
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

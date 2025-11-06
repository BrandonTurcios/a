import React from 'react';
import { Layout } from 'antd';
import DashboardHome from '../dashboard/DashboardHome';
import LoadingView from '../views/LoadingView';
import TableView from '../views/TableView';
import FormView from '../views/FormView';

const { Content } = Layout;

const ContentArea = ({
  activeTab,
  selectedMenuInfo,
  tableInfo,
  formInfo,
  loadingContent,
  sessionData,
  formDirty,
  onFormChange,
  toolbarHandlers,
  onRecordClick,
  selectedRecord,
  onRecordSelect,
  formRef
}) => {
  const renderContent = () => {
    console.log('🎨 ContentArea renderContent:', {
      loadingContent,
      activeTab,
      hasTableInfo: !!tableInfo,
      hasFormInfo: !!formInfo,
      viewType: selectedMenuInfo?.viewType
    });

    // Loading
    if (loadingContent) {
      return <LoadingView />;
    }

    // Dashboard home
    if (activeTab === 'dashboard') {
      return <DashboardHome sessionData={sessionData} />;
    }

    // Form view - CHECK THIS FIRST to prioritize form over table
    if (formInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'form') {
      console.log('🎨 Rendering FormView');
      return (
        <FormView
          formInfo={formInfo}
          selectedMenuInfo={selectedMenuInfo}
          loadingContent={loadingContent}
          formDirty={formDirty}
          onFormChange={onFormChange}
          toolbarHandlers={toolbarHandlers}
          formRef={formRef}
        />
      );
    }

    // Table view
    if (tableInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'tree') {
      console.log('🎨 Rendering TableView');
      return (
        <TableView
          tableInfo={tableInfo}
          selectedMenuInfo={selectedMenuInfo}
          loadingContent={loadingContent}
          formDirty={formDirty}
          toolbarHandlers={toolbarHandlers}
          onRecordClick={onRecordClick}
          selectedRecord={selectedRecord}
          onRecordSelect={onRecordSelect}
        />
      );
    }

    // Empty state
    console.log('🎨 Rendering DashboardHome (fallback)');
    return <DashboardHome sessionData={sessionData} />;
  };

  return (
    <Content style={{ background: 'var(--color-background)' }}>
      {renderContent()}
    </Content>
  );
};

export default ContentArea;

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
  onRecordSelect
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
    <Content style={{ background: '#F8F9FA' }}>
      {renderContent()}
    </Content>
  );
};

export default React.memo(ContentArea, (prevProps, nextProps) => {
  // Only re-render if important props have changed
  const propsEqual = (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.selectedMenuInfo === nextProps.selectedMenuInfo &&
    prevProps.tableInfo === nextProps.tableInfo &&
    prevProps.formInfo === nextProps.formInfo &&
    prevProps.loadingContent === nextProps.loadingContent &&
    prevProps.sessionData === nextProps.sessionData &&
    prevProps.formDirty === nextProps.formDirty &&
    prevProps.onFormChange === nextProps.onFormChange &&
    prevProps.toolbarHandlers === nextProps.toolbarHandlers &&
    prevProps.onRecordClick === nextProps.onRecordClick &&
    prevProps.onRecordSelect === nextProps.onRecordSelect &&
    // Compare selectedRecord by ID only
    (prevProps.selectedRecord?.id === nextProps.selectedRecord?.id)
  );
  
  if (!propsEqual) {
    console.log('🔄 ContentArea will re-render due to prop changes');
  }
  
  return propsEqual;
});

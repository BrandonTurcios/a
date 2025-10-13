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
  sessionData
}) => {
  const renderContent = () => {
    // Loading
    if (loadingContent) {
      return <LoadingView />;
    }

    // Dashboard home
    if (activeTab === 'dashboard') {
      return <DashboardHome sessionData={sessionData} />;
    }

    // Table view
    if (tableInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'tree') {
      return <TableView tableInfo={tableInfo} selectedMenuInfo={selectedMenuInfo} />;
    }

    // Form view
    if (formInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'form') {
      return <FormView formInfo={formInfo} selectedMenuInfo={selectedMenuInfo} />;
    }

    // Empty state
    return <DashboardHome sessionData={sessionData} />;
  };

  return (
    <Content style={{ background: '#F8F9FA' }}>
      {renderContent()}
    </Content>
  );
};

export default ContentArea;

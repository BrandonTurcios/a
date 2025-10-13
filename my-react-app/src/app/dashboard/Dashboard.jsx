import React from 'react';
import { Layout } from 'antd';
import DashboardHeader from './DashboardHeader';
import Sidebar from '../layout/Sidebar';
import ContentArea from '../layout/ContentArea';
import ActionOptionsModal from '../../components/ActionOptionsModal';
import WizardModal from '../../components/WizardModal';
import { useMenuData } from '../hooks/useMenuData';
import { useMenuActions } from '../hooks/useMenuActions';
import { useWizards } from '../hooks/useWizards';
import { useActionOptions } from '../hooks/useActionOptions';

/**
 * Dashboard Principal
 */
const Dashboard = ({ sessionData, onLogout }) => {
  // Custom hooks encapsulan toda la lógica
  const menuData = useMenuData(sessionData);
  const menuActions = useMenuActions();
  const wizards = useWizards();
  const actionOptions = useActionOptions();

  // Manejar clicks del menú con lógica de wizards y opciones
  const handleMenuClick = async (item) => {
    const result = await menuActions.handleMenuClick(item);

    if (result?.type === 'wizard') {
      await wizards.handleWizardAction(result.data.wizardName, result.data.actionName);
    } else if (result?.type === 'multipleOptions') {
      actionOptions.showActionOptions(result.data, result.item);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header fijo */}
      <DashboardHeader
        sessionData={sessionData}
        onLogout={onLogout}
        onToggleSidebar={menuData.toggleSidebar}
      />

      <Layout>
        {/* Sidebar fijo */}
        <Sidebar
          open={menuData.sidebarOpen}
          menuItems={menuData.items}
          loading={menuData.loading}
          error={menuData.error}
          expandedMenus={menuActions.expandedMenus}
          activeTab={menuActions.activeTab}
          onMenuClick={handleMenuClick}
          onToggleExpansion={menuActions.toggleExpansion}
          onRetry={menuData.reload}
        />

        {/* Content Area con margin para el sidebar fijo */}
        <Layout style={{
          marginLeft: menuData.sidebarOpen ? 320 : 80,
          marginTop: 64,
          transition: 'margin-left 0.2s'
        }}>
          <ContentArea
            activeTab={menuActions.activeTab}
            selectedMenuInfo={menuActions.selectedMenuInfo}
            tableInfo={menuActions.tableInfo}
            formInfo={menuActions.formInfo}
            loadingContent={menuActions.loadingContent}
            sessionData={sessionData}
          />
        </Layout>
      </Layout>

      {/* Modals */}
      <ActionOptionsModal
        isOpen={actionOptions.showModal}
        options={actionOptions.options}
        onClose={actionOptions.closeModal}
        onSelect={actionOptions.handleSelectOption}
      />

      <WizardModal
        visible={wizards.showWizard}
        wizardInfo={wizards.wizardInfo}
        loading={wizards.wizardLoading}
        onClose={wizards.closeWizard}
        onCancel={wizards.handleWizardCancel}
        onSubmit={wizards.handleWizardSubmit}
      />
    </Layout>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import DashboardHeader from './DashboardHeader';
import Sidebar from '../layout/Sidebar';
import ContentArea from '../layout/ContentArea';
import TabsBar from '../layout/TabsBar';
import ActionOptionsModal from '../../components/ActionOptionsModal';
import WizardModal from '../../components/WizardModal';
import { useMenuData } from '../hooks/useMenuData';
import { useMenuActions } from '../hooks/useMenuActions';
import { useWizards } from '../hooks/useWizards';
import { useActionOptions } from '../hooks/useActionOptions';
import { useTabs } from '../hooks/useTabs';
import trytonService from '../../services/trytonService';

/**
 * Dashboard Principal
 */
const Dashboard = ({ sessionData, onLogout }) => {
  // Custom hooks encapsulan toda la lógica
  const menuData = useMenuData(sessionData);
  const menuActions = useMenuActions();
  const wizards = useWizards();
  const actionOptions = useActionOptions();
  const tabs = useTabs();

  // Estado para rastrear cambios en formularios
  const [formDirty, setFormDirty] = useState(false);

  // Manejar clicks del menú con lógica de wizards y opciones
  const handleMenuClick = async (item) => {
    const result = await menuActions.handleMenuClick(item);

    if (result?.type === 'wizard') {
      await wizards.handleWizardAction(result.data.wizardName, result.data.actionName);
    } else if (result?.type === 'multipleOptions') {
      actionOptions.showActionOptions(result.data, result.item);
    } else if (result?.type === 'success') {
      // Crear nueva tab cuando se abre un contenido exitosamente
      const tabId = `tab-${item.id}-${Date.now()}`;
      tabs.createTab({
        id: tabId,
        title: item.name,
        type: 'content',
        data: {
          menuItem: item,
          selectedMenuInfo: menuActions.selectedMenuInfo,
          tableInfo: menuActions.tableInfo,
          formInfo: menuActions.formInfo
        }
      });
      
      // Actualizar la tab con los datos actuales
      setTimeout(() => {
        tabs.updateTabData(tabId, {
          selectedMenuInfo: menuActions.selectedMenuInfo,
          tableInfo: menuActions.tableInfo,
          formInfo: menuActions.formInfo
        });
      }, 100);
    }
  };

  // Toolbar handlers
  const handleToolbarNavigate = (action, value) => {
    console.log('Toolbar navigate:', action, value);
    // TODO: Implementar navegación entre registros
  };

  const handleToolbarCreate = async () => {
    try {
      console.log('🔧 Toolbar create clicked - cambiando a vista de formulario');

      if (!menuActions.selectedMenuInfo || !menuActions.selectedMenuInfo.resModel) {
        console.warn('No hay información del menú seleccionado');
        return;
      }

      menuActions.setLoadingContent(true);

      const model = menuActions.selectedMenuInfo.resModel;
      console.log(`📝 Creando nuevo registro para modelo: ${model}`);

      // Obtener vista de formulario
      console.log('🔍 Obteniendo vista de formulario...');
      const formFieldsView = await trytonService.getFieldsView(model, null, 'form');

      if (!formFieldsView) {
        throw new Error('No se pudo obtener la vista de formulario');
      }

      // Obtener valores por defecto
      const defaultValues = await trytonService.getDefaultValues(model, formFieldsView);

      const formData = {
        model: model,
        viewId: formFieldsView.view_id,
        recordData: defaultValues,
        fieldsView: formFieldsView,
        isNew: true
      };

      menuActions.setFormInfo(formData);
      menuActions.setTableInfo(null); // Limpiar tabla
      menuActions.setSelectedMenuInfo(prev => ({
        ...prev,
        viewType: 'form'
      }));
      setFormDirty(false);
      menuActions.setLoadingContent(false);
    } catch (error) {
      console.error('Error creando nuevo registro:', error);
      menuActions.setLoadingContent(false);
    }
  };

  const handleToolbarSave = () => {
    console.log('Toolbar save clicked');
    // TODO: Implementar guardado de registro
  };

  const handleToolbarRefresh = () => {
    console.log('Toolbar refresh clicked');
    // TODO: Implementar refrescar datos
  };

  const handleToolbarAttach = () => {
    console.log('Toolbar attach clicked');
    // TODO: Implementar adjuntos
  };

  const handleToolbarComment = () => {
    console.log('Toolbar comment clicked');
    // TODO: Implementar comentarios
  };

  const handleToolbarAction = (actionItem) => {
    console.log('Toolbar action clicked:', actionItem);
    // TODO: Implementar acciones del toolbar
  };

  const handleToolbarRelate = (relateItem) => {
    console.log('Toolbar relate clicked:', relateItem);
    // TODO: Implementar relaciones
  };

  const handleToolbarPrint = (printItem) => {
    console.log('Toolbar print clicked:', printItem);
    // TODO: Implementar impresión
  };

  const handleToolbarEmail = (emailItem) => {
    console.log('Toolbar email clicked:', emailItem);
    // TODO: Implementar envío de email
  };

  const handleToolbarSwitchView = async () => {
    try {
      console.log('🔄 Toolbar switch view clicked');

      if (menuActions.selectedMenuInfo?.viewType !== 'form') {
        console.warn('Switch view is only available in form view');
        return;
      }

      if (formDirty) {
        const confirmed = window.confirm('You have unsaved changes. Do you want to discard them and switch to list view?');
        if (!confirmed) {
          return;
        }
      }

      menuActions.setLoadingContent(true);

      const model = menuActions.selectedMenuInfo.resModel;
      console.log(`🔄 Switching from form to tree view for model: ${model}`);

      // Obtener vista de tabla
      const treeFieldsView = await trytonService.getFieldsView(model, null, 'tree');

      if (!treeFieldsView) {
        throw new Error('Could not get tree view');
      }

      // Obtener datos de la tabla
      const tableData = await trytonService.getTableInfo(
        model,
        treeFieldsView.view_id,
        'tree',
        [],
        100
      );

      menuActions.setTableInfo(tableData);
      menuActions.setFormInfo(null);
      menuActions.setSelectedMenuInfo(prev => ({
        ...prev,
        viewType: 'tree'
      }));
      setFormDirty(false);
      menuActions.setLoadingContent(false);
    } catch (error) {
      console.error('Error switching view:', error);
      menuActions.setLoadingContent(false);
    }
  };

  const handleRecordClick = async (recordId, record) => {
    try {
      console.log('📝 Record clicked:', recordId, record);

      if (formDirty) {
        const confirmed = window.confirm('You have unsaved changes. Do you want to discard them and open this record?');
        if (!confirmed) {
          return;
        }
      }

      if (!menuActions.selectedMenuInfo || !menuActions.selectedMenuInfo.resModel) {
        console.warn('No model information available');
        return;
      }

      menuActions.setLoadingContent(true);

      const model = menuActions.selectedMenuInfo.resModel;
      console.log(`📝 Opening record ${recordId} for model: ${model}`);

      // Obtener vista de formulario
      const formFieldsView = await trytonService.getFieldsView(model, null, 'form');

      if (!formFieldsView) {
        throw new Error('Could not get form view');
      }

      // Obtener campos expandidos para relaciones
      const fields = Object.keys(formFieldsView.fields || {});
      const expandedFields = trytonService.expandFieldsForRelationsFromFieldsView(
        fields,
        formFieldsView
      );

      // Obtener datos del registro
      const recordData = await trytonService.getFormRecordData(
        model,
        recordId,
        expandedFields
      );

      const formData = {
        model: model,
        viewId: formFieldsView.view_id,
        recordData: recordData,
        fieldsView: formFieldsView,
        isNew: false
      };

      console.log('✅ formData created:', formData);
      console.log('✅ Setting formInfo with:', formData);
      menuActions.setFormInfo(formData);

      console.log('✅ Clearing tableInfo');
      menuActions.setTableInfo(null);

      console.log('✅ Updating selectedMenuInfo to form view');
      menuActions.setSelectedMenuInfo(prev => ({
        ...prev,
        viewType: 'form'
      }));

      setFormDirty(false);
      menuActions.setLoadingContent(false);
      console.log('✅ Record opened successfully, should show form now');
    } catch (error) {
      console.error('Error opening record:', error);
      menuActions.setLoadingContent(false);
    }
  };

  // Manejadores para tabs
  const handleTabChange = (tabId) => {
    tabs.activateTab(tabId);
    
    if (tabId === 'dashboard') {
      menuActions.setActiveTab('dashboard');
      menuActions.clearState();
    } else {
      const tab = tabs.getActiveTab();
      if (tab && tab.data) {
        // Restaurar estado de la tab
        menuActions.setSelectedMenuInfo(tab.data.selectedMenuInfo);
        menuActions.setTableInfo(tab.data.tableInfo);
        menuActions.setFormInfo(tab.data.formInfo);
        menuActions.setActiveTab(tab.data.menuItem?.id || 'content');
      }
    }
  };

  const handleCloseTab = (tabId) => {
    tabs.closeTab(tabId);
    
    // Si se cerró la tab activa, volver al dashboard
    if (tabId === tabs.activeTabId) {
      menuActions.setActiveTab('dashboard');
      menuActions.clearState();
    }
  };

  const handleCloseAllTabs = () => {
    tabs.closeAllTabs();
    menuActions.setActiveTab('dashboard');
    menuActions.clearState();
  };

  // Sincronizar datos de la tab activa cuando cambien los datos del menú
  useEffect(() => {
    if (tabs.activeTabId !== 'dashboard') {
      const activeTab = tabs.getActiveTab();
      if (activeTab && activeTab.data) {
        tabs.updateTabData(tabs.activeTabId, {
          selectedMenuInfo: menuActions.selectedMenuInfo,
          tableInfo: menuActions.tableInfo,
          formInfo: menuActions.formInfo
        });
      }
    }
  }, [menuActions.selectedMenuInfo, menuActions.tableInfo, menuActions.formInfo, tabs.activeTabId]);

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
          {/* Tabs Bar */}
          <TabsBar
            tabs={tabs.tabs}
            activeTabId={tabs.activeTabId}
            onTabChange={handleTabChange}
            onCloseTab={handleCloseTab}
            onCloseAllTabs={handleCloseAllTabs}
          />
          
          <ContentArea
            activeTab={tabs.activeTabId}
            selectedMenuInfo={menuActions.selectedMenuInfo}
            tableInfo={menuActions.tableInfo}
            formInfo={menuActions.formInfo}
            loadingContent={menuActions.loadingContent}
            sessionData={sessionData}
            formDirty={formDirty}
            onFormChange={setFormDirty}
            onRecordClick={handleRecordClick}
            toolbarHandlers={{
              onNavigate: handleToolbarNavigate,
              onCreate: handleToolbarCreate,
              onSave: handleToolbarSave,
              onRefresh: handleToolbarRefresh,
              onAttach: handleToolbarAttach,
              onComment: handleToolbarComment,
              onAction: handleToolbarAction,
              onRelate: handleToolbarRelate,
              onPrint: handleToolbarPrint,
              onEmail: handleToolbarEmail,
              onSwitchView: handleToolbarSwitchView
            }}
          />
        </Layout>
      </Layout>

      {/* Modals */}
      <ActionOptionsModal
        isOpen={actionOptions.showModal}
        options={actionOptions.options}
        onClose={actionOptions.closeModal}
        onSelectOption={async (_selectedIndex, selectedOption) => {
          try {
            menuActions.setLoadingContent(true);
            const result = await actionOptions.handleSelectOption(selectedOption);

            if (result.success && result.result) {
              const actionResult = result.result;

              if (actionResult.viewType === 'tree' && actionResult.tableData) {
                menuActions.setTableInfo(actionResult.tableData);
                menuActions.setFormInfo(null);
              } else if (actionResult.viewType === 'form' && actionResult.formData) {
                menuActions.setFormInfo(actionResult.formData);
                menuActions.setTableInfo(null);
              }

              menuActions.setSelectedMenuInfo({
                menuItem: actionOptions.pendingMenuItem,
                actionInfo: [selectedOption],
                toolbarInfo: actionResult.toolbarInfo,
                resModel: actionResult.resModel,
                actionName: actionResult.actionName,
                viewType: actionResult.viewType,
                viewId: actionResult.viewId,
                timestamp: new Date().toISOString()
              });

              menuActions.setActiveTab(actionOptions.pendingMenuItem?.id || 'content');
            }

            menuActions.setLoadingContent(false);
          } catch (error) {
            console.error('Error handling selected option:', error);
            menuActions.setLoadingContent(false);
          }
        }}
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

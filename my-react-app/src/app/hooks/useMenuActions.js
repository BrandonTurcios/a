import { useState } from 'react';
import trytonService from '../../services/trytonService';

/**
 * Hook para manejar las acciones del menú (clicks, expansión, datos)
 */
export const useMenuActions = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState(new Set());
  const [selectedMenuInfo, setSelectedMenuInfo] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [formInfo, setFormInfo] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const toggleExpansion = (menuId) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const clearState = () => {
    setSelectedMenuInfo(null);
    setTableInfo(null);
    setFormInfo(null);
  };

  const handleMenuClick = async (item) => {
    try {
      // Dashboard home
      if (item.id === 'dashboard') {
        setActiveTab(item.id);
        clearState();
        setLoadingContent(false);
        return;
      }

      // Items con hijos: solo expandir/contraer
      const hasChildren = item.childs && item.childs.length > 0;
      if (hasChildren) {
        toggleExpansion(item.id);
        return;
      }

      // Items hoja: cargar contenido
      setActiveTab(item.id);
      setLoadingContent(true);
      clearState();

      console.log(`📂 Click en menú: ${item.name} (ID: ${item.id})`);

      // Obtener información de la acción del menú
      const menuInfo = await trytonService.getMenuActionInfo(item.id);
      console.log('📋 Información de acción obtenida:', menuInfo);

      // Manejar wizard
      if (menuInfo.isWizard) {
        console.log('🧙 Es un wizard, delegando...');
        // El wizard se maneja con el hook useWizards
        setLoadingContent(false);
        return { type: 'wizard', data: menuInfo };
      }

      // Manejar múltiples opciones
      if (menuInfo.hasMultipleOptions) {
        console.log('⚠️ Múltiples opciones disponibles');
        setLoadingContent(false);
        return { type: 'multipleOptions', data: menuInfo, item };
      }

      // Acción directa
      await processDirectAction(item, menuInfo);

      setLoadingContent(false);
      return { type: 'success' };
    } catch (error) {
      console.error('❌ Error en handleMenuClick:', error);
      setLoadingContent(false);
      clearState();
      setActiveTab(item.id);
      return { type: 'error', error };
    }
  };

  const processDirectAction = async (item, menuInfo) => {
    let tableData = null;
    let formData = null;
    let viewType = null;
    let viewId = null;

    // Si ya tenemos fieldsView del servicio
    if (menuInfo.fieldsView && menuInfo.viewType) {
      const realViewType = menuInfo.fieldsView.type || menuInfo.viewType;
      viewType = realViewType;
      viewId = menuInfo.viewId;

      if (realViewType === 'tree') {
        if (viewId) {
          tableData = await trytonService.getTableInfo(
            menuInfo.resModel,
            viewId,
            'tree',
            [],
            100
          );
        }
      } else if (realViewType === 'form') {
        const fields = Object.keys(menuInfo.fieldsView.fields || {});
        const expandedFields = trytonService.expandFieldsForRelationsFromFieldsView(
          fields,
          menuInfo.fieldsView
        );

        let recordData = null;
        try {
          recordData = await trytonService.getFormRecordData(
            menuInfo.resModel,
            1,
            expandedFields
          );
        } catch (err) {
          console.warn('⚠️ Error obteniendo datos del registro:', err);
        }

        formData = {
          model: menuInfo.resModel,
          viewId: menuInfo.viewId,
          viewType: 'form',
          fieldsView: menuInfo.fieldsView,
          recordData: recordData
        };
      }
    } else {
      // Fallback: obtener vista manualmente
      const actionData = menuInfo.actionInfo[0];
      if (actionData.views && actionData.views.length > 0) {
        const treeView = actionData.views.find(view => view[1] === 'tree');
        const formView = actionData.views.find(view => view[1] === 'form');
        const selectedView = treeView || formView || actionData.views[0];

        viewId = selectedView[0];
        viewType = selectedView[1];

        const fieldsView = await trytonService.getFieldsView(
          menuInfo.resModel,
          viewId,
          viewType
        );

        const realViewType = fieldsView.type;
        viewType = realViewType;

        if (realViewType === 'tree' && viewId) {
          tableData = await trytonService.getTableInfo(
            menuInfo.resModel,
            viewId,
            'tree',
            [],
            100
          );
        } else if (realViewType === 'form') {
          const fields = Object.keys(fieldsView.fields || {});
          const expandedFields = trytonService.expandFieldsForRelationsFromFieldsView(
            fields,
            fieldsView
          );

          let recordData = null;
          try {
            recordData = await trytonService.getFormRecordData(
              menuInfo.resModel,
              1,
              expandedFields
            );
          } catch (err) {
            console.warn('⚠️ Error obteniendo datos:', err);
          }

          formData = {
            model: menuInfo.resModel,
            viewId: viewId,
            viewType: 'form',
            fieldsView: fieldsView,
            recordData: recordData
          };
        }
      }
    }

    // Establecer estado basado en el tipo de vista
    if (viewType === 'tree' && tableData) {
      setTableInfo(tableData);
      setFormInfo(null);
    } else if (viewType === 'form' && formData) {
      setFormInfo(formData);
      setTableInfo(null);
    } else {
      setTableInfo(null);
      setFormInfo(null);
    }

    setSelectedMenuInfo({
      menuItem: item,
      actionInfo: menuInfo.actionInfo,
      toolbarInfo: menuInfo.toolbarInfo,
      resModel: menuInfo.resModel,
      actionName: menuInfo.actionName,
      viewType: viewType,
      viewId: viewId,
      timestamp: new Date().toISOString()
    });

    setActiveTab(item.id);
  };

  return {
    activeTab,
    expandedMenus,
    selectedMenuInfo,
    tableInfo,
    formInfo,
    loadingContent,
    handleMenuClick,
    toggleExpansion,
    clearState,
    setLoadingContent,
    setFormInfo,
    setTableInfo,
    setSelectedMenuInfo,
    setActiveTab
  };
};

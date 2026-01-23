import { useState } from 'react';
import trytonService from '../../services/trytonService';

/**
 * Hook para manejar las acciones del menú (clicks, expansión, datos)
 */
export const useMenuActions = (loadMenuChildren) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState(new Set());
  const [selectedMenuInfo, setSelectedMenuInfo] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [formInfo, setFormInfo] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingMenuChildren, setLoadingMenuChildren] = useState(new Set());

  const toggleExpansion = async (menuId, item) => {
    const newExpanded = new Set(expandedMenus);
    const isExpanding = !newExpanded.has(menuId);

    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);

    // Si está expandiendo y tiene hijos no cargados, cargarlos
    if (isExpanding && item.hasChildren && !item.childrenLoaded && loadMenuChildren) {
      try {
        setLoadingMenuChildren(prev => new Set(prev).add(menuId));
        await loadMenuChildren(menuId);
      } catch (err) {
        console.error(`Error loading children for menu ${menuId}:`, err);
      } finally {
        setLoadingMenuChildren(prev => {
          const newSet = new Set(prev);
          newSet.delete(menuId);
          return newSet;
        });
      }
    }
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
        return { type: 'dashboard' };
      }

      // Items con hijos cargados: solo expandir/contraer
      const hasChildren = (item.childs && item.childs.length > 0) || item.hasChildren;
      if (hasChildren) {
        await toggleExpansion(item.id, item);
        return { type: 'expand' };
      }

      // Items hoja: cargar contenido
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
          recordData: recordData,
          isNativeForm: true // This is a native form opened from menu
        };
      }
    } else {
      // Fallback: obtener vista manualmente
      if (!menuInfo.actionInfo || !Array.isArray(menuInfo.actionInfo) || menuInfo.actionInfo.length === 0) {
        console.error('❌ No hay actionInfo disponible en menuInfo:', menuInfo);
        throw new Error('No se pudo obtener información de la acción del menú');
      }

      const actionData = menuInfo.actionInfo[0];
      if (!actionData) {
        console.error('❌ actionData es undefined:', menuInfo.actionInfo);
        throw new Error('No se pudo obtener datos de la acción');
      }

      if (actionData.views && actionData.views.length > 0) {
        const treeView = actionData.views.find(view => view[1] === 'tree');
        const formView = actionData.views.find(view => view[1] === 'form');
        const selectedView = treeView || formView || actionData.views[0];

        if (!selectedView || !Array.isArray(selectedView) || selectedView.length < 2) {
          console.error('❌ Vista seleccionada inválida:', selectedView);
          throw new Error('No se pudo determinar la vista a usar');
        }

        viewId = selectedView[0];
        viewType = selectedView[1];

        if (!menuInfo.resModel) {
          console.error('❌ No hay resModel en menuInfo:', menuInfo);
          throw new Error('No se pudo determinar el modelo para la vista');
        }

        let fieldsView = null;
        try {
          fieldsView = await trytonService.getFieldsView(
            menuInfo.resModel,
            viewId,
            viewType
          );
        } catch (err) {
          console.error('❌ Error obteniendo fieldsView:', err);
          throw new Error(`No se pudo obtener la vista: ${err.message}`);
        }

        if (!fieldsView || typeof fieldsView !== 'object') {
          console.error('❌ fieldsView inválido:', fieldsView);
          throw new Error('La vista obtenida no es válida');
        }

        const realViewType = fieldsView.type;
        if (!realViewType) {
          console.error('❌ fieldsView no tiene tipo:', fieldsView);
          throw new Error('La vista no tiene un tipo definido');
        }

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
            recordData: recordData,
            isNativeForm: true // This is a native form opened from menu
          };
        }
      } else {
        console.error('❌ No hay vistas disponibles en actionData:', actionData);
        throw new Error('La acción del menú no tiene vistas definidas');
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
  };

  return {
    activeTab,
    expandedMenus,
    selectedMenuInfo,
    tableInfo,
    formInfo,
    loadingContent,
    loadingMenuChildren,
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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Layout } from 'antd';
import DashboardHeader from './DashboardHeader';
import Sidebar from '../layout/Sidebar';
import ContentArea from '../layout/ContentArea';
import TabsBar from '../layout/TabsBar';
import ActionOptionsModal from '../../components/ActionOptionsModal';
import WizardModal from '../../components/WizardModal';
import EmailModal from '../../components/EmailModal';
import { useMenuData } from '../hooks/useMenuData';
import { useMenuActions } from '../hooks/useMenuActions';
import { useWizards } from '../hooks/useWizards';
import { useActionOptions } from '../hooks/useActionOptions';
import { useTabs } from '../hooks/useTabs';
import trytonService from '../../services/trytonService';

/**
 * Dashboard Principal
 */
const Dashboard = ({ sessionData, onLogout, onLanguageChange }) => {
  // Custom hooks encapsulan toda la lógica
  const menuData = useMenuData(sessionData);
  const menuActions = useMenuActions();
  const wizards = useWizards();
  const actionOptions = useActionOptions();
  const tabs = useTabs();

  // Estado para rastrear cambios en formularios
  const [formDirty, setFormDirty] = useState(false);

  // Estado para rastrear el item del menú pendiente de crear tab
  const [pendingTabCreation, setPendingTabCreation] = useState(null);
  
  // Estado para evitar conflictos durante el cambio de tab
  const [isChangingTab, setIsChangingTab] = useState(false);

  // Estado para rastrear el registro seleccionado en la tabla
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Estado para el modal de email
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const formRef = useRef(null);
  // Restaurar estado de navegación después de cambio de idioma
  useEffect(() => {
    // Solo ejecutar cuando el menú ha terminado de cargar
    if (!menuData.loading && menuData.items.length > 0) {
      const savedNavState = sessionStorage.getItem('tryton_nav_state');
      if (savedNavState) {
        try {
          const navState = JSON.parse(savedNavState);
          console.log('🔄 Restaurando estado de navegación:', navState);

          // 1. Restaurar tabs abiertos
          if (navState.tabs && navState.activeTabId) {
            const restored = tabs.restoreTabs(navState.tabs, navState.activeTabId);
            if (restored) {
              console.log(`✅ Restaurados ${navState.tabs.length} tabs, activo: ${navState.activeTabId}`);

              // Restaurar el contenido de la tab activa
              setTimeout(() => {
                const activeTab = navState.tabs.find(t => t.id === navState.activeTabId);
                if (activeTab && activeTab.data) {
                  console.log('📋 Restaurando datos de la tab activa:', activeTab.data);
                  menuActions.setSelectedMenuInfo(activeTab.data.selectedMenuInfo);
                  menuActions.setTableInfo(activeTab.data.tableInfo);
                  menuActions.setFormInfo(activeTab.data.formInfo);
                  menuActions.setActiveTab(activeTab.data.menuItem?.id || 'content');
                  console.log('✅ Contenido de la tab activa restaurado');
                }
              }, 100);
            }
          }

          // 2. Restaurar menús expandidos
          if (navState.expandedMenus && menuActions.toggleExpansion) {
            Object.keys(navState.expandedMenus).forEach((key) => {
              if (navState.expandedMenus[key]) {
                menuActions.toggleExpansion(key);
              }
            });
            console.log('✅ Menús expandidos restaurados');
          }

          // Limpiar el estado guardado después de restaurarlo
          sessionStorage.removeItem('tryton_nav_state');
          console.log('✅ Estado de navegación completamente restaurado');
        } catch (error) {
          console.error('❌ Error restaurando estado de navegación:', error);
          sessionStorage.removeItem('tryton_nav_state');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData.loading, menuData.items.length]); // Ejecutar cuando termine de cargar el menú

  // Handler para cambio de idioma con estado de navegación
  const handleLanguageChangeWithState = (newLanguage) => {
    // Capturar estado actual de navegación
    const navigationState = {
      activeTabId: tabs.activeTabId,
      tabs: tabs.tabs,
      selectedMenuInfo: menuActions.selectedMenuInfo,
      expandedMenus: menuActions.expandedMenus
    };

    // Llamar a onLanguageChange con el nuevo idioma y el estado
    onLanguageChange(newLanguage, navigationState);
  };

  // Manejar clicks del menú con lógica de wizards y opciones
  const handleMenuClick = async (item) => {
    const result = await menuActions.handleMenuClick(item);

    if (result?.type === 'wizard') {
      await wizards.handleWizardAction(result.data.wizardName, result.data.actionName);
    } else if (result?.type === 'multipleOptions') {
      actionOptions.showActionOptions(result.data, result.item);
    } else if (result?.type === 'success') {
      // Marcar que hay una tab pendiente de crear
      setPendingTabCreation(item);
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
        isNew: true,
        isNativeForm: false // This form was created from table context, not natively
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
    console.log('💾 Toolbar save clicked');
    // Si hay una ref del formulario, llamar a su método submit
    if (formRef.current) {
      console.log('💾 Llamando submit del formulario desde toolbar');
      formRef.current.submit();
    } else {
      console.warn('⚠️ No hay referencia al formulario disponible');
    }
  };

  const handleToolbarRefresh = async () => {
    try {
      console.log('🔄 Toolbar refresh clicked');

      if (!menuActions.selectedMenuInfo || !menuActions.selectedMenuInfo.resModel) {
        console.warn('⚠️ No hay información del menú seleccionado');
        return;
      }

      menuActions.setLoadingContent(true);

      const model = menuActions.selectedMenuInfo.resModel;
      const viewType = menuActions.selectedMenuInfo.viewType;

      console.log(`🔄 Refrescando datos para modelo: ${model}, vista: ${viewType}`);

      if (viewType === 'tree') {
        // Refrescar vista de tabla
        await refreshTableView(model);
      } else if (viewType === 'form') {
        // Refrescar vista de formulario
        await refreshFormView(model);
      } else {
        console.warn('⚠️ Tipo de vista no soportado para refresh:', viewType);
      }

      console.log('✅ Datos refrescados correctamente');
    } catch (error) {
      console.error('❌ Error refrescando datos:', error);
      alert('Error al refrescar los datos: ' + error.message);
    } finally {
      menuActions.setLoadingContent(false);
    }
  };

  const refreshTableView = async (model) => {
    try {
      console.log('🔄 Refrescando vista de tabla para modelo:', model);

      // Obtener información actual de la tabla
      const currentTableInfo = menuActions.tableInfo;
      if (!currentTableInfo) {
        console.warn('⚠️ No hay información de tabla para refrescar');
        return;
      }

      const viewId = currentTableInfo.viewId;
      const viewType = currentTableInfo.viewType || 'tree';
      const domain = currentTableInfo.domain || [];
      const limit = currentTableInfo.limit || 100;

      console.log('🔄 Parámetros de refresh:', {
        model,
        viewId,
        viewType,
        domain,
        limit
      });

      // Refrescar datos de la tabla
      const refreshedTableInfo = await trytonService.getTableInfo(
        model,
        viewId,
        viewType,
        domain,
        limit
      );

      console.log('✅ Datos de tabla refrescados:', refreshedTableInfo);

      // Actualizar el estado con los nuevos datos
      menuActions.setTableInfo(refreshedTableInfo);
    } catch (error) {
      console.error('❌ Error refrescando tabla:', error);
      throw error;
    }
  };

  const refreshFormView = async (model) => {
    try {
      console.log('🔄 Refrescando vista de formulario para modelo:', model);

      // Obtener información actual del formulario
      const currentFormInfo = menuActions.formInfo;
      if (!currentFormInfo) {
        console.warn('⚠️ No hay información de formulario para refrescar');
        return;
      }

      const recordId = currentFormInfo.recordData?.id;
      if (!recordId) {
        console.warn('⚠️ No hay ID de registro para refrescar');
        return;
      }

      const viewId = currentFormInfo.viewId;
      const fieldsView = currentFormInfo.fieldsView;

      console.log('🔄 Refrescando registro:', {
        model,
        recordId,
        viewId
      });

      // Obtener campos expandidos para relaciones
      const fields = fieldsView?.fields ? Object.keys(fieldsView.fields) : [];
      const expandedFields = trytonService.expandFieldsForRelationsFromFieldsView(
        fields,
        fieldsView
      );

      // Refrescar datos del registro
      const refreshedRecordData = await trytonService.getFormRecordData(
        model,
        recordId,
        expandedFields
      );

      console.log('✅ Datos del registro refrescados:', refreshedRecordData);

      // Actualizar el estado con los nuevos datos
      const updatedFormInfo = {
        ...currentFormInfo,
        recordData: refreshedRecordData
      };

      menuActions.setFormInfo(updatedFormInfo);
      setFormDirty(false); // Los datos refrescados no están modificados
    } catch (error) {
      console.error('❌ Error refrescando formulario:', error);
      throw error;
    }
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

  const handleToolbarRelate = async (relateItem) => {
    try {
      console.log('🔗 Toolbar relate clicked:', relateItem);

      if (!menuActions.selectedMenuInfo || !menuActions.selectedMenuInfo.resModel) {
        console.warn('No hay información del menú seleccionado');
        return;
      }

      menuActions.setLoadingContent(true);

      // Obtener información del contexto actual
      const currentModel = menuActions.selectedMenuInfo.resModel;
      const currentRecordId = selectedRecord?.id || null;

      console.log(`🔗 Opening relate view for: ${relateItem.name}`);
      console.log(`📋 From model: ${currentModel}, Record ID: ${currentRecordId}`);

      // Llamar al servicio para manejar la acción relate
      const relateResult = await trytonService.handleRelateAction(
        relateItem,
        currentModel,
        currentRecordId
      );

      if (relateResult.success) {
        console.log('✅ Relate action successful:', relateResult);

        // Crear nueva tab con la vista relacionada
        const tabId = `relate-${relateItem.id}-${Date.now()}`;
        const tabTitle = relateResult.actionName || relateItem.name;

        // Preparar datos para la nueva tab
        const newTabData = {
          menuItem: {
            id: `relate-${relateItem.id}`,
            name: tabTitle,
            icon: '🔗',
            model: relateResult.resModel,
            description: `Relate: ${tabTitle}`
          },
          selectedMenuInfo: {
            menuItem: {
              id: `relate-${relateItem.id}`,
              name: tabTitle,
              icon: '🔗',
              model: relateResult.resModel
            },
            actionInfo: [relateItem],
            toolbarInfo: relateResult.toolbarInfo,
            resModel: relateResult.resModel,
            actionName: relateResult.actionName,
            viewType: relateResult.viewType,
            viewId: relateResult.viewId,
            timestamp: new Date().toISOString()
          },
          tableInfo: relateResult.tableData,
          formInfo: relateResult.formData
        };

        // Crear la nueva tab
        tabs.createTab({
          id: tabId,
          title: tabTitle,
          type: 'content',
          data: newTabData
        });

        // Activar la nueva tab
        tabs.activateTab(tabId);

        // Actualizar el estado del menú para la nueva tab
        menuActions.setSelectedMenuInfo(newTabData.selectedMenuInfo);
        menuActions.setTableInfo(relateResult.tableData);
        menuActions.setFormInfo(relateResult.formData);
        menuActions.setActiveTab(`relate-${relateItem.id}`);

        console.log(`✅ New relate tab created: ${tabTitle}`);
      }

      menuActions.setLoadingContent(false);
    } catch (error) {
      console.error('Error handling relate action:', error);
      menuActions.setLoadingContent(false);
    }
  };

  const handleToolbarPrint = async (printItem) => {
    try {
      console.log('🖨️ Toolbar print clicked:', printItem);

      // Verificar que haya un registro seleccionado
      if (!selectedRecord || !selectedRecord.id) {
        console.warn('⚠️ No hay registro seleccionado para imprimir');
        // Si estamos en vista de formulario, intentar obtener el ID del formulario
        if (menuActions.selectedMenuInfo?.viewType === 'form' && menuActions.formInfo?.recordData?.id) {
          const recordId = menuActions.formInfo.recordData.id;
          await executePrint(printItem, recordId);
          return;
        }
        alert('Por favor, selecciona un registro para imprimir');
        return;
      }

      const recordId = selectedRecord.id;
      await executePrint(printItem, recordId);
    } catch (error) {
      console.error('❌ Error ejecutando impresión:', error);
      alert('Error al ejecutar la impresión: ' + error.message);
    }
  };

  const executePrint = async (printItem, recordId) => {
    try {
      menuActions.setLoadingContent(true);

      // Obtener información del modelo actual
      const model = menuActions.selectedMenuInfo?.resModel;
      if (!model) {
        throw new Error('No se pudo determinar el modelo del registro');
      }

      console.log('🖨️ Ejecutando reporte:', {
        printItem,
        recordId,
        model
      });

      // El printItem puede tener diferentes estructuras
      // Intentar obtener el método del reporte de diferentes formas
      let reportMethod = printItem.action || printItem.method || printItem.report_name || printItem.report;
      
      // Si no hay método directo, intentar obtener desde action_id
      if (!reportMethod && printItem.action_id) {
        try {
          // Obtener la información de la acción de reporte
          const actionData = await trytonService.makeRpcCall(
            'model.ir.action.report.read',
            [[printItem.action_id], ['report_name', 'name']]
          );
          
          if (actionData && actionData.length > 0 && actionData[0].report_name) {
            // El report_name generalmente es el método del reporte
            reportMethod = actionData[0].report_name;
            console.log('✅ Método del reporte obtenido desde action:', reportMethod);
          }
        } catch (error) {
          console.warn('⚠️ No se pudo obtener el método desde action_id:', error);
        }
      }

      // Si aún no tenemos el método, intentar construirlo desde el nombre del printItem
      if (!reportMethod) {
        // El printItem.name podría contener información útil
        // Por ahora, lanzar un error para que el usuario vea qué estructura tiene
        console.error('❌ Estructura del printItem:', printItem);
        throw new Error('No se pudo determinar el método del reporte. Ver consola para detalles del printItem.');
      }

      // Construir los parámetros según la estructura que muestra el usuario
      // params: [[ids], {action_id, id, ids, model, ...}, {context}]
      const actionId = printItem.id || printItem.action_id;
      const ids = [recordId];
      
      const params = [
        [recordId], // Primer parámetro: array de IDs
        {
          action_id: actionId,
          id: recordId,
          ids: ids,
          model: model,
          model_context: null,
          paths: [[recordId]]
        },
        {
          // El contexto se agregará automáticamente por makeRpcCall
        }
      ];

      console.log('📤 Ejecutando reporte con parámetros:', {
        method: reportMethod,
        params
      });

      // Ejecutar el reporte
      const result = await trytonService.makeRpcCall(reportMethod, params);

      console.log('📥 Respuesta del reporte:', result);

      // La respuesta debería ser: ["pdf", {__class__: "bytes", base64: "..."}, false, "nombre"]
      if (!result || !Array.isArray(result) || result.length < 2) {
        throw new Error('Respuesta del reporte inválida');
      }

      const [format, pdfData, directPrint, reportName] = result;

      if (format !== 'pdf') {
        throw new Error(`Formato de reporte no soportado: ${format}`);
      }

      if (!pdfData || !pdfData.base64) {
        throw new Error('No se recibieron datos del PDF');
      }

      // Decodificar el PDF desde base64
      const base64Data = pdfData.base64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Crear URL del blob
      const pdfUrl = URL.createObjectURL(blob);

      // Abrir el PDF en una nueva ventana/pestaña
      const newWindow = window.open(pdfUrl, '_blank');
      
      if (!newWindow) {
        // Si el popup fue bloqueado, crear un enlace de descarga
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `${reportName || printItem.name || 'reporte'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pdfUrl);
        alert('El PDF se descargará. Si el popup fue bloqueado, verifica la configuración de tu navegador.');
      } else {
        // Limpiar la URL después de que la ventana se cierre (opcional)
        newWindow.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(pdfUrl);
        });
      }

      console.log('✅ PDF generado y abierto correctamente');
    } catch (error) {
      console.error('❌ Error ejecutando reporte:', error);
      throw error;
    } finally {
      menuActions.setLoadingContent(false);
    }
  };

  const handleToolbarEmail = (emailItem) => {
    console.log('📧 Toolbar email clicked:', emailItem);
    
    if (!selectedRecord) {
      console.warn('No record selected for email');
      return;
    }
    
    setEmailModalVisible(true);
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

  const handleRecordClick = useCallback(async (recordId, record) => {
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
        isNew: false,
        isNativeForm: false // This form was opened from table, not natively
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
  }, [formDirty, menuActions]);

  const handleRecordSelect = useCallback((record, isSelected) => {
    console.log('✅ Record selection changed:', record, isSelected);
    if (isSelected) {
      setSelectedRecord(record);
    } else {
      setSelectedRecord(null);
    }
  }, []);

  // Debug: Log current state
  console.log('🔧 Dashboard - selectedRecord:', selectedRecord);
  console.log('🔧 Dashboard - emailModalVisible:', emailModalVisible);

  // Clear selection when switching views or tabs
  useEffect(() => {
    setSelectedRecord(null);
  }, [menuActions.selectedMenuInfo?.viewType, tabs.activeTabId]);

  // Manejadores para tabs
  const handleTabChange = (tabId) => {
    console.log('🔄 Cambiando a tab:', tabId);
    
    // Marcar que estamos cambiando de tab para evitar conflictos
    setIsChangingTab(true);
    
    tabs.activateTab(tabId);
    
    const tab = tabs.tabs.find(t => t.id === tabId);
    if (tab && tab.data) {
      console.log('📋 Restaurando datos de tab:', tab.data);
      // Restaurar estado de la tab
      menuActions.setSelectedMenuInfo(tab.data.selectedMenuInfo);
      menuActions.setTableInfo(tab.data.tableInfo);
      menuActions.setFormInfo(tab.data.formInfo);
      menuActions.setActiveTab(tab.data.menuItem?.id || 'content');
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

  // Obtener datos de la tab activa usando useMemo para optimización
  const activeTabData = useMemo(() => {
    // Si no hay tab activa, mostrar dashboard
    if (!tabs.activeTabId || tabs.tabs.length === 0) {
      return {
        selectedMenuInfo: null,
        tableInfo: null,
        formInfo: null,
        activeTab: 'dashboard'
      };
    }
    
    const activeTab = tabs.tabs.find(t => t.id === tabs.activeTabId);
    if (activeTab && activeTab.data) {
      return {
        selectedMenuInfo: activeTab.data.selectedMenuInfo,
        tableInfo: activeTab.data.tableInfo,
        formInfo: activeTab.data.formInfo,
        activeTab: activeTab.data.menuItem?.id || 'content'
      };
    }
    
    return {
      selectedMenuInfo: null,
      tableInfo: null,
      formInfo: null,
      activeTab: 'dashboard'
    };
  }, [tabs.activeTabId, tabs.tabs]);

  // Crear tab cuando los datos estén listos
  useEffect(() => {
    if (pendingTabCreation && menuActions.selectedMenuInfo && 
        (menuActions.tableInfo || menuActions.formInfo)) {
      
      console.log('✅ Datos listos, creando tab para:', pendingTabCreation.name);
      
      const tabId = `tab-${pendingTabCreation.id}-${Date.now()}`;
      
      tabs.createTab({
        id: tabId,
        title: pendingTabCreation.name,
        type: 'content',
        data: {
          menuItem: pendingTabCreation,
          selectedMenuInfo: menuActions.selectedMenuInfo,
          tableInfo: menuActions.tableInfo,
          formInfo: menuActions.formInfo
        }
      });
      
      // Limpiar el estado pendiente
      setPendingTabCreation(null);
    }
  }, [pendingTabCreation, menuActions.selectedMenuInfo, menuActions.tableInfo, menuActions.formInfo, tabs]);

  // Detectar cuando se completa el cambio de tab
  useEffect(() => {
    if (isChangingTab && menuActions.selectedMenuInfo) {
      // El cambio de tab se completó, permitir sincronización
      console.log('✅ Cambio de tab completado, permitiendo sincronización');
      setIsChangingTab(false);
    }
  }, [isChangingTab, menuActions.selectedMenuInfo]);

  // Sincronizar datos de la tab activa cuando cambien los datos del menú
  // Solo actualizar si estamos en una tab de contenido y no hay conflictos
  useEffect(() => {
    if (tabs.activeTabId && menuActions.selectedMenuInfo && !pendingTabCreation && !isChangingTab) {
      const activeTab = tabs.getActiveTab();
      if (activeTab && activeTab.data) {
        // Solo actualizar si los datos han cambiado realmente
        const currentData = activeTab.data;
        const hasChanged = (
          currentData.selectedMenuInfo !== menuActions.selectedMenuInfo ||
          currentData.tableInfo !== menuActions.tableInfo ||
          currentData.formInfo !== menuActions.formInfo
        );
        
        if (hasChanged) {
          console.log('🔄 Actualizando datos de tab activa');
          tabs.updateTabData(tabs.activeTabId, {
            selectedMenuInfo: menuActions.selectedMenuInfo,
            tableInfo: menuActions.tableInfo,
            formInfo: menuActions.formInfo
          });
        }
      }
    }
  }, [menuActions.selectedMenuInfo, menuActions.tableInfo, menuActions.formInfo, pendingTabCreation, isChangingTab, tabs.activeTabId]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header fijo */}
      <DashboardHeader
        sessionData={sessionData}
        onLogout={onLogout}
        onToggleSidebar={menuData.toggleSidebar}
        onLanguageChange={handleLanguageChangeWithState}
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
          {/* Tabs Bar - Solo mostrar si hay tabs */}
          {tabs.tabs.length > 0 && (
            <TabsBar
              tabs={tabs.tabs}
              activeTabId={tabs.activeTabId}
              onTabChange={handleTabChange}
              onCloseTab={handleCloseTab}
              onCloseAllTabs={handleCloseAllTabs}
            />
          )}
          
          <ContentArea
            activeTab={activeTabData.activeTab}
            selectedMenuInfo={activeTabData.selectedMenuInfo}
            tableInfo={activeTabData.tableInfo}
            formInfo={activeTabData.formInfo}
            loadingContent={menuActions.loadingContent}
            sessionData={sessionData}
            formDirty={formDirty}
            onFormChange={setFormDirty}
            onRecordClick={handleRecordClick}
            selectedRecord={selectedRecord}
            onRecordSelect={handleRecordSelect}
            formRef={formRef}
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

      <EmailModal
        visible={emailModalVisible}
        onClose={() => setEmailModalVisible(false)}
        selectedRecord={selectedRecord}
        model={menuActions.selectedMenuInfo?.resModel}
        loading={menuActions.loadingContent}
      />
    </Layout>
  );
};

export default Dashboard;

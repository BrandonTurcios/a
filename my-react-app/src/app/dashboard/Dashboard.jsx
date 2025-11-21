import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { Layout, message } from "antd";
import DashboardHeader from "./DashboardHeader";
import Sidebar from "../layout/Sidebar";
import ContentArea from "../layout/ContentArea";
import TabsBar from "../layout/TabsBar";
import ActionOptionsModal from "../../components/ActionOptionsModal";
import WizardModal from "../../components/WizardModal";
import EmailModal from "../../components/EmailModal";
import { useMenuData } from "../hooks/useMenuData";
import { useMenuActions } from "../hooks/useMenuActions";
import { useWizards } from "../hooks/useWizards";
import { useActionOptions } from "../hooks/useActionOptions";
import { useTabs } from "../hooks/useTabs";
import trytonService from "../../services/trytonService";

/**
 * Dashboard Principal
 */
const Dashboard = ({ sessionData, onLogout, onLanguageChange }) => {
  const { t } = useTranslation();

  // Custom hooks encapsulan toda la lógica
  const menuData = useMenuData(sessionData);
  const menuActions = useMenuActions(menuData.loadMenuChildren);
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
    if (!menuData.loading && menuData.items.length > 0) {
      const savedNavState = sessionStorage.getItem("tryton_nav_state");
      if (savedNavState) {
        (async () => {
          try {
            const navState = JSON.parse(savedNavState);
            // 1. Restaurar tabs abiertos
            if (navState.tabs && navState.activeTabId) {
              const findMenuItemById = async (items, id) => {
                // Buscar localmente primero
                for (const item of items) {
                  if (item.id === id) return item;
                  if (item.childs && Array.isArray(item.childs) && item.childs.length > 0) {
                    const found = await findMenuItemById(item.childs, id);
                    if (found) return found;
                  }
                }

                // Si no se encuentra localmente, intentar cargar del backend
                try {
                  const menuItem = await trytonService.getMenuItemById(id);
                  if (menuItem) {
                    return menuItem;
                  }
                } catch (error) {
                  console.error(`Error fetching menu item ${id} from backend:`, error);
                }

                return null;
              };

              console.log(`Actualizando ${navState.tabs.length} tabs...`);
              const updatedTabs = await Promise.all(navState.tabs.map(async (tab) => {
              console.log(`Tab "${tab.title}":`, {
                hasData: !!tab.data,
                hasMenuItem: !!(tab.data && tab.data.menuItem),
                menuItemId: tab.data?.menuItem?.id,
              });

              if (tab.data && tab.data.menuItem && tab.data.menuItem.id) {
                const updatedMenuItem = await findMenuItemById(
                  menuData.items,
                  tab.data.menuItem.id
                );
                if (updatedMenuItem) {
                  console.log(
                    `Actualizando título de tab "${tab.title}" a "${updatedMenuItem.name}"`
                  );

                  // Actualizar también el selectedMenuInfo dentro del data
                  const updatedSelectedMenuInfo = tab.data.selectedMenuInfo
                    ? {
                        ...tab.data.selectedMenuInfo,
                        menuName: updatedMenuItem.name,
                        actionName: updatedMenuItem.name,
                        menuItem: updatedMenuItem,
                      }
                    : tab.data.selectedMenuInfo;

                  return {
                    ...tab,
                    title: updatedMenuItem.name,
                    data: {
                      ...tab.data,
                      menuItem: updatedMenuItem,
                      selectedMenuInfo: updatedSelectedMenuInfo,
                    },
                  };
                } else {
                  console.log(
                    `No se encontró menuItem con id ${tab.data.menuItem.id} para tab "${tab.title}"`
                  );
                }
              } else {
                console.log(
                  `Tab "${tab.title}" no tiene menuItem.id, no se puede actualizar`
                );
              }
              return tab;
            }));

            const restored = tabs.restoreTabs(
              updatedTabs,
              navState.activeTabId
            );

            if (restored) {
              // Restaurar el contenido de la tab activa
              setTimeout(() => {
                const activeTab = updatedTabs.find(
                  (t) => t.id === navState.activeTabId
                );
                if (activeTab && activeTab.data) {
                  // El menuItem ya está actualizado en updatedTabs
                  let updatedSelectedMenuInfo = activeTab.data.selectedMenuInfo;
                  if (activeTab.data.menuItem) {
                    // Actualizar selectedMenuInfo con el nuevo nombre del menú
                    updatedSelectedMenuInfo = {
                      ...activeTab.data.selectedMenuInfo,
                      menuName: activeTab.data.menuItem.name,
                      actionName: activeTab.data.menuItem.name,
                      menuItem: activeTab.data.menuItem,
                    };
                  }

                  menuActions.setSelectedMenuInfo(updatedSelectedMenuInfo);
                  menuActions.setTableInfo(activeTab.data.tableInfo);
                  menuActions.setFormInfo(activeTab.data.formInfo);
                  menuActions.setActiveTab(
                    activeTab.data.menuItem?.id || "content"
                  );
                  console.log("✅ Contenido de la tab activa restaurado");
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
            console.log("✅ Menús expandidos restaurados");
          }

            // Limpiar el estado guardado después de restaurarlo
            sessionStorage.removeItem("tryton_nav_state");
            console.log("✅ Estado de navegación completamente restaurado");
          } catch (error) {
            console.error("❌ Error restaurando estado de navegación:", error);
            sessionStorage.removeItem("tryton_nav_state");
          }
        })();
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
      expandedMenus: menuActions.expandedMenus,
    };

    // Llamar a onLanguageChange con el nuevo idioma y el estado
    onLanguageChange(newLanguage, navigationState);
  };

  // Manejar clicks del menú con lógica de wizards y opciones
  const handleMenuClick = async (item) => {
    const result = await menuActions.handleMenuClick(item);

    if (result?.type === "wizard") {
      await wizards.handleWizardAction(
        result.data.wizardName,
        result.data.actionName
      );
    } else if (result?.type === "multipleOptions") {
      actionOptions.showActionOptions(result.data, result.item);
    } else if (result?.type === "success") {
      // Marcar que hay una tab pendiente de crear
      setPendingTabCreation(item);
    }
  };

  // Toolbar handlers
  const handleToolbarNavigate = (action, value) => {
    console.log("Toolbar navigate:", action, value);
    // TODO: Implementar navegación entre registros
  };

  const handleToolbarCreate = async () => {
    try {
      console.log(
        "🔧 Toolbar create clicked - cambiando a vista de formulario"
      );

      if (
        !menuActions.selectedMenuInfo ||
        !menuActions.selectedMenuInfo.resModel
      ) {
        console.warn("No hay información del menú seleccionado");
        return;
      }

      menuActions.setLoadingContent(true);

      const model = menuActions.selectedMenuInfo.resModel;
      console.log(`📝 Creando nuevo registro para modelo: ${model}`);

      // Obtener vista de formulario
      console.log("🔍 Obteniendo vista de formulario...");
      const formFieldsView = await trytonService.getFieldsView(
        model,
        null,
        "form"
      );

      if (!formFieldsView) {
        throw new Error(t("errors.couldNotGetFormView"));
      }

      // Obtener valores por defecto
      const defaultValues = await trytonService.getDefaultValues(
        model,
        formFieldsView
      );

      const formData = {
        model: model,
        viewId: formFieldsView.view_id,
        recordData: defaultValues,
        fieldsView: formFieldsView,
        isNew: true,
        isNativeForm: false, // This form was created from table context, not natively
      };

      menuActions.setFormInfo(formData);
      menuActions.setTableInfo(null); // Limpiar tabla
      menuActions.setSelectedMenuInfo((prev) => ({
        ...prev,
        viewType: "form",
      }));
      setFormDirty(false);
      menuActions.setLoadingContent(false);
    } catch (error) {
      console.error("Error creando nuevo registro:", error);
      menuActions.setLoadingContent(false);
    }
  };

  const handleToolbarSave = () => {
    console.log("Toolbar save clicked");
    // TODO: Implementar guardado de registro
  };

  const handleToolbarRefresh = () => {
    console.log("Toolbar refresh clicked");
    // TODO: Implementar refrescar datos
  };

  const handleToolbarAttach = () => {
    console.log("Toolbar attach clicked");
    // TODO: Implementar adjuntos
  };

  const handleToolbarComment = () => {
    console.log("Toolbar comment clicked");
    // TODO: Implementar comentarios
  };

  const handleToolbarAction = (actionItem) => {
    console.log("Toolbar action clicked:", actionItem);
    // TODO: Implementar acciones del toolbar
  };

  const handleToolbarRelate = async (relateItem) => {
    try {
      console.log("🔗 Toolbar relate clicked:", relateItem);

      if (
        !menuActions.selectedMenuInfo ||
        !menuActions.selectedMenuInfo.resModel
      ) {
        console.warn("No hay información del menú seleccionado");
        return;
      }

      menuActions.setLoadingContent(true);

      // Obtener información del contexto actual
      const currentModel = menuActions.selectedMenuInfo.resModel;
      const currentRecordId = selectedRecord?.id || null;

      console.log(`🔗 Opening relate view for: ${relateItem.name}`);
      console.log(
        `📋 From model: ${currentModel}, Record ID: ${currentRecordId}`
      );

      // Llamar al servicio para manejar la acción relate
      const relateResult = await trytonService.handleRelateAction(
        relateItem,
        currentModel,
        currentRecordId
      );

      if (relateResult.success) {
        console.log("✅ Relate action successful:", relateResult);

        // Crear nueva tab con la vista relacionada
        const tabId = `relate-${relateItem.id}-${Date.now()}`;
        const tabTitle = relateResult.actionName || relateItem.name;

        // Preparar datos para la nueva tab
        const newTabData = {
          menuItem: {
            id: `relate-${relateItem.id}`,
            name: tabTitle,
            icon: "🔗",
            model: relateResult.resModel,
            description: `Relate: ${tabTitle}`,
          },
          selectedMenuInfo: {
            menuItem: {
              id: `relate-${relateItem.id}`,
              name: tabTitle,
              icon: "🔗",
              model: relateResult.resModel,
            },
            actionInfo: [relateItem],
            toolbarInfo: relateResult.toolbarInfo,
            resModel: relateResult.resModel,
            actionName: relateResult.actionName,
            viewType: relateResult.viewType,
            viewId: relateResult.viewId,
            timestamp: new Date().toISOString(),
          },
          tableInfo: relateResult.tableData,
          formInfo: relateResult.formData,
        };

        // Crear la nueva tab
        tabs.createTab({
          id: tabId,
          title: tabTitle,
          type: "content",
          data: newTabData,
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
      console.error("Error handling relate action:", error);
      menuActions.setLoadingContent(false);
    }
  };

  const handleToolbarPrint = async (printItem) => {
    console.log("🖨️ Toolbar print clicked:", printItem);
    console.log("📋 Selected record:", selectedRecord);
    
    if (!selectedRecord) {
      console.warn("⚠️ No record selected for print");
      message.warning(t('toolbar.selectRecordForPrint') || 'Por favor seleccione un registro para imprimir');
      return;
    }

    if (!printItem || !printItem.report_name) {
      console.warn("⚠️ Invalid print item:", printItem);
      message.error(t('errors.invalidPrintItem') || 'Item de impresión inválido');
      return;
    }

    try {
      const reportName = printItem.report_name;
      const recordId = selectedRecord.id;
      const model = menuActions.selectedMenuInfo?.resModel;

      if (!model) {
        console.warn("⚠️ No model available for print");
        message.error(t('errors.noModelForPrint') || 'No hay modelo disponible para imprimir');
        return;
      }

      console.log("🖨️ Executing report:", reportName, "for record:", recordId, "in model:", model);

      // Construir el método RPC: report.{report_name}.execute
      const rpcMethod = `report.${reportName}.execute`;

      // Construir los parámetros según el formato de Tryton
      // [ids], context, session_context
      const ids = [recordId];
      const context = {
        action_id: printItem.id,
        id: recordId,
        ids: ids,
        model: model,
        model_context: null,
        paths: [ids]
      };

      // Ejecutar el reporte
      const result = await trytonService.makeRpcCall(rpcMethod, [
        ids,
        context,
        {} // El contexto de sesión se agrega automáticamente
      ]);

      console.log("🖨️ Report result:", result);

      // La respuesta es un array: ["pdf", {__class__: "bytes", base64: "..."}, false, "filename"]
      if (result && Array.isArray(result) && result.length >= 2) {
        const pdfType = result[0];
        const pdfData = result[1];
        const filename = result[3] || `${reportName}.pdf`;

        if (pdfType === "pdf" && pdfData && pdfData.base64) {
          // Convertir base64 a blob
          const base64Data = pdfData.base64;
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          
          // Crear URL del blob y abrir en nueva pestaña
          const url = URL.createObjectURL(blob);
          const newWindow = window.open(url, '_blank');
          
          if (!newWindow) {
            // Si el navegador bloquea la ventana emergente, mostrar mensaje
            message.warning(t('errors.popupBlocked') || 'Por favor permita ventanas emergentes para ver el reporte');
          } else {
            // Limpiar la URL del blob después de un tiempo
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
          }
        } else {
          console.error("❌ Invalid PDF data format:", result);
          message.error(t('errors.invalidPdfData') || 'Formato de datos PDF inválido');
        }
      } else {
        console.error("❌ Invalid report result format:", result);
        message.error(t('errors.invalidReportResult') || 'Formato de resultado del reporte inválido');
      }
    } catch (error) {
      console.error("❌ Error executing print report:", error);
      message.error(t('errors.printFailed') || 'Error al ejecutar el reporte');
    }
  };

  const handleToolbarEmail = (emailItem) => {
    console.log("📧 Toolbar email clicked:", emailItem);

    if (!selectedRecord) {
      console.warn("No record selected for email");
      return;
    }

    setEmailModalVisible(true);
  };

  const handleToolbarSwitchView = async () => {
    try {
      console.log("🔄 Toolbar switch view clicked");

      if (menuActions.selectedMenuInfo?.viewType !== "form") {
        console.warn("Switch view is only available in form view");
        return;
      }

      if (formDirty) {
        const confirmed = window.confirm(t("dashboard.unsavedChangesWarning"));
        if (!confirmed) {
          return;
        }
      }

      menuActions.setLoadingContent(true);

      const model = menuActions.selectedMenuInfo.resModel;
      console.log(`🔄 Switching from form to tree view for model: ${model}`);

      // Obtener vista de tabla
      const treeFieldsView = await trytonService.getFieldsView(
        model,
        null,
        "tree"
      );

      if (!treeFieldsView) {
        throw new Error(t("errors.viewNotTree"));
      }

      // Obtener datos de la tabla
      const tableData = await trytonService.getTableInfo(
        model,
        treeFieldsView.view_id,
        "tree",
        [],
        100
      );

      menuActions.setTableInfo(tableData);
      menuActions.setFormInfo(null);
      menuActions.setSelectedMenuInfo((prev) => ({
        ...prev,
        viewType: "tree",
      }));
      setFormDirty(false);
      menuActions.setLoadingContent(false);
    } catch (error) {
      console.error("Error switching view:", error);
      menuActions.setLoadingContent(false);
    }
  };

  const handleRecordClick = useCallback(
    async (recordId, record) => {
      try {
        console.log("📝 Record clicked:", recordId, record);

        if (formDirty) {
          const confirmed = window.confirm(t("dashboard.unsavedChangesRecord"));
          if (!confirmed) {
            return;
          }
        }

        if (
          !menuActions.selectedMenuInfo ||
          !menuActions.selectedMenuInfo.resModel
        ) {
          console.warn(t("dashboard.noModelInfo"));
          return;
        }

        menuActions.setLoadingContent(true);

        const model = menuActions.selectedMenuInfo.resModel;
        console.log(`📝 Opening record ${recordId} for model: ${model}`);

        // Obtener vista de formulario
        const formFieldsView = await trytonService.getFieldsView(
          model,
          null,
          "form"
        );

        if (!formFieldsView) {
          throw new Error(t("errors.couldNotGetFormView"));
        }

        // Obtener campos expandidos para relaciones
        const fields = Object.keys(formFieldsView.fields || {});
        const expandedFields =
          trytonService.expandFieldsForRelationsFromFieldsView(
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
          isNativeForm: false, // This form was opened from table, not natively
        };

        console.log("✅ formData created:", formData);
        console.log("✅ Setting formInfo with:", formData);
        menuActions.setFormInfo(formData);

        console.log("✅ Clearing tableInfo");
        menuActions.setTableInfo(null);

        console.log("✅ Updating selectedMenuInfo to form view");
        menuActions.setSelectedMenuInfo((prev) => ({
          ...prev,
          viewType: "form",
        }));

        setFormDirty(false);
        menuActions.setLoadingContent(false);
        console.log("✅ Record opened successfully, should show form now");
      } catch (error) {
        console.error("Error opening record:", error);
        menuActions.setLoadingContent(false);
      }
    },
    [formDirty, menuActions]
  );

  const handleRecordSelect = useCallback((record, isSelected) => {
    console.log("✅ Record selection changed:", record, isSelected);
    if (isSelected) {
      setSelectedRecord(record);
    } else {
      setSelectedRecord(null);
    }
  }, []);

  // Debug: Log current state
  console.log("🔧 Dashboard - selectedRecord:", selectedRecord);
  console.log("🔧 Dashboard - emailModalVisible:", emailModalVisible);

  // Clear selection when switching views or tabs
  useEffect(() => {
    setSelectedRecord(null);
  }, [menuActions.selectedMenuInfo?.viewType, tabs.activeTabId]);

  // Manejadores para tabs
  const handleTabChange = (tabId) => {
    console.log("🔄 Cambiando a tab:", tabId);

    // Marcar que estamos cambiando de tab para evitar conflictos
    setIsChangingTab(true);

    tabs.activateTab(tabId);

    const tab = tabs.tabs.find((t) => t.id === tabId);
    if (tab && tab.data) {
      console.log("Restaurando datos de tab:", tab.data);
      console.log("Actualizando datos de tab activa:", {
        menuName: tab.data.selectedMenuInfo?.menuName,
        actionName: tab.data.selectedMenuInfo?.actionName,
        menuItemName: tab.data.menuItem?.name,
      });
      // Restaurar estado de la tab
      menuActions.setSelectedMenuInfo(tab.data.selectedMenuInfo);
      menuActions.setTableInfo(tab.data.tableInfo);
      menuActions.setFormInfo(tab.data.formInfo);
      menuActions.setActiveTab(tab.data.menuItem?.id || "content");
    }
  };

  const handleCloseTab = (tabId) => {
    tabs.closeTab(tabId);

    // Si se cerró la tab activa, volver al dashboard
    if (tabId === tabs.activeTabId) {
      menuActions.setActiveTab("dashboard");
      menuActions.clearState();
    }
  };

  const handleCloseAllTabs = () => {
    tabs.closeAllTabs();
    menuActions.setActiveTab("dashboard");
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
        activeTab: "dashboard",
      };
    }

    const activeTab = tabs.tabs.find((t) => t.id === tabs.activeTabId);
    if (activeTab && activeTab.data) {
      return {
        selectedMenuInfo: activeTab.data.selectedMenuInfo,
        tableInfo: activeTab.data.tableInfo,
        formInfo: activeTab.data.formInfo,
        activeTab: activeTab.data.menuItem?.id || "content",
      };
    }

    return {
      selectedMenuInfo: null,
      tableInfo: null,
      formInfo: null,
      activeTab: "dashboard",
    };
  }, [tabs.activeTabId, tabs.tabs]);

  // Crear tab cuando los datos estén listos
  useEffect(() => {
    if (
      pendingTabCreation &&
      menuActions.selectedMenuInfo &&
      (menuActions.tableInfo || menuActions.formInfo)
    ) {
      console.log(
        "✅ Datos listos, creando tab para:",
        pendingTabCreation.name
      );

      // Usar solo el ID del menú sin timestamp para evitar duplicados al cambiar idioma
      const tabId = `tab-${pendingTabCreation.id}`;

      tabs.createTab({
        id: tabId,
        title: pendingTabCreation.name,
        type: "content",
        data: {
          menuItem: pendingTabCreation,
          selectedMenuInfo: menuActions.selectedMenuInfo,
          tableInfo: menuActions.tableInfo,
          formInfo: menuActions.formInfo,
        },
      });

      // Limpiar el estado pendiente
      setPendingTabCreation(null);
    }
  }, [
    pendingTabCreation,
    menuActions.selectedMenuInfo,
    menuActions.tableInfo,
    menuActions.formInfo,
    tabs,
  ]);

  // Detectar cuando se completa el cambio de tab
  useEffect(() => {
    if (isChangingTab && menuActions.selectedMenuInfo) {
      // El cambio de tab se completó, permitir sincronización
      console.log("✅ Cambio de tab completado, permitiendo sincronización");
      setIsChangingTab(false);
    }
  }, [isChangingTab, menuActions.selectedMenuInfo]);

  // Sincronizar datos de la tab activa cuando cambien los datos del menú
  // Solo actualizar si estamos en una tab de contenido y no hay conflictos
  useEffect(() => {
    if (
      tabs.activeTabId &&
      menuActions.selectedMenuInfo &&
      !pendingTabCreation &&
      !isChangingTab
    ) {
      const activeTab = tabs.getActiveTab();
      if (activeTab && activeTab.data) {
        // Solo actualizar si los datos han cambiado realmente
        const currentData = activeTab.data;
        const hasChanged =
          currentData.selectedMenuInfo !== menuActions.selectedMenuInfo ||
          currentData.tableInfo !== menuActions.tableInfo ||
          currentData.formInfo !== menuActions.formInfo;

        if (hasChanged) {
          console.log("🔄 Actualizando datos de tab activa");
          tabs.updateTabData(tabs.activeTabId, {
            selectedMenuInfo: menuActions.selectedMenuInfo,
            tableInfo: menuActions.tableInfo,
            formInfo: menuActions.formInfo,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    menuActions.selectedMenuInfo,
    menuActions.tableInfo,
    menuActions.formInfo,
    pendingTabCreation,
    isChangingTab,
    tabs.activeTabId,
  ]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
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
          loadingMenuChildren={menuActions.loadingMenuChildren}
          onMenuClick={handleMenuClick}
          onToggleExpansion={menuActions.toggleExpansion}
          onRetry={menuData.reload}
        />

        {/* Content Area con margin para el sidebar fijo */}
        <Layout
          style={{
            marginLeft: menuData.sidebarOpen ? 320 : 80,
            marginTop: 96,
            transition: "margin-left 0.2s",
          }}
        >
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
              onSwitchView: handleToolbarSwitchView,
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
            const result = await actionOptions.handleSelectOption(
              selectedOption
            );

            if (result.success && result.result) {
              const actionResult = result.result;

              if (actionResult.viewType === "tree" && actionResult.tableData) {
                menuActions.setTableInfo(actionResult.tableData);
                menuActions.setFormInfo(null);
              } else if (
                actionResult.viewType === "form" &&
                actionResult.formData
              ) {
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
                timestamp: new Date().toISOString(),
              });

              menuActions.setActiveTab(
                actionOptions.pendingMenuItem?.id || "content"
              );
            }

            menuActions.setLoadingContent(false);
          } catch (error) {
            console.error("Error handling selected option:", error);
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

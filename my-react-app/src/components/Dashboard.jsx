import { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Input,
  Avatar,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Badge,
  Dropdown,
  Spin,
  Alert,
  Tag,
  Divider,
  Tooltip
} from 'antd';
import {
  MenuOutlined,
  SearchOutlined,
  LogoutOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons';
import {
  Heart,
  User,
  Calendar,
  Pill,
  Building2,
  BarChart3,
  Shield,
  Database,
  Settings,
  FileText,
  Activity,
  Users,
  Stethoscope,
  Hospital,
  ClipboardList,
  DollarSign,
  ShoppingCart,
  Package
} from 'lucide-react';
import trytonService from '../services/trytonService';
import TrytonTable from './TrytonTable';
import TrytonForm from './TrytonForm';
import ActionOptionsModal from './ActionOptionsModal';
import WizardModal from './WizardModal';
import Toolbar from './Toolbar';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const Dashboard = ({ sessionData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMenus, setExpandedMenus] = useState(new Set());
  const [selectedMenuInfo, setSelectedMenuInfo] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [formInfo, setFormInfo] = useState(null);
  const [showActionOptionsModal, setShowActionOptionsModal] = useState(false);
  const [actionOptions, setActionOptions] = useState([]);
  const [pendingMenuItem, setPendingMenuItem] = useState(null);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardInfo, setWizardInfo] = useState(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    loadSidebarMenu();
  }, []);

  // Efecto para limpiar el loading cuando todos los datos estén listos
  useEffect(() => {
    // Si hay datos de tabla o formulario listos, limpiar el loading
    if (loadingContent && (tableInfo || formInfo) && selectedMenuInfo) {
      console.log('🎯 Todos los datos están listos, limpiando loading...');
      setLoadingContent(false);
    }
    
    // Si hay modales abiertos (wizard o action options), también limpiar el loading
    if (loadingContent && (showWizardModal || showActionOptionsModal)) {
      console.log('🎯 Modal abierto, limpiando loading...');
      setLoadingContent(false);
    }
  }, [loadingContent, tableInfo, formInfo, selectedMenuInfo, showWizardModal, showActionOptionsModal]);

  // Aplicar estilos de scroll personalizados
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .sidebar-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .sidebar-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 3px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.5);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Efecto para manejar el responsive del sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) { // breakpoint lg de Ant Design
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Ejecutar al cargar

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadSidebarMenu = async () => {
    try {
      setLoading(true);
      console.log('Cargando menú del sidebar...');

      // Restaurar la sesión en el servicio
      console.log('Restaurando sesión en el servicio...');
      console.log('Datos de sesión disponibles:', sessionData);
      console.log('Datos de sesión tipo:', typeof sessionData);
      console.log('Datos de sesión keys:', Object.keys(sessionData || {}));

      // Restaurar la sesión en el servicio Tryton
      const sessionRestored = trytonService.restoreSession(sessionData);

      if (!sessionRestored) {
        throw new Error('No se pudo restaurar la sesión. Los datos de sesión son inválidos.');
      }

      // Validar que la sesión sea válida (opcional - no crítico)
      console.log('Validando sesión restaurada...');
      try {
        // Pequeño delay para asegurar que la sesión esté completamente establecida
        await new Promise(resolve => setTimeout(resolve, 500));

        const isValid = await trytonService.validateSession();
        if (!isValid) {
          console.warn('⚠️ La sesión no se pudo validar, pero continuando...');
        } else {
          console.log('✅ Sesión validada correctamente');
        }
      } catch (validationError) {
        console.warn('⚠️ Error validando sesión, pero continuando:', validationError.message);
      }

      const result = await trytonService.getSidebarMenu();
      console.log('Resultado completo del menú:', result);

      // Mostrar información de las preferencias
      if (result.preferences) {
        console.log('Usuario:', result.preferences.user_name);
        console.log('Compañía:', result.preferences.company_rec_name);
        console.log('Idioma:', result.preferences.language);
        console.log('Grupos:', result.preferences.groups?.length || 0);
      }

      // Mostrar información de acceso a modelos
      if (result.modelAccess) {
        console.log('Acceso a modelos cargado:', result.modelAccess.length || 0);
        console.log('Modelos con acceso:', result.modelAccess.map(ma => ma.model).slice(0, 10));
      }

      // Mostrar información de iconos
      if (result.icons) {
        console.log('Iconos disponibles:', result.icons.length || 0);
      }

      // Mostrar información de vistas
      if (result.viewSearch) {
        console.log('Vistas de búsqueda:', result.viewSearch.length || 0);
      }

      // Convertir los módulos a elementos del menú con submenús
      const sidebarItems = [
        {
          id: 'dashboard',
          name: 'Dashboard',
          icon: '📊',
          type: 'dashboard',
          modelAccessCount: result.modelAccess?.length || 0,
          childs: []
        },
        ...result.menuItems.map(item => ({
          id: item.id,
          name: item.name,
          icon: item.icon,
          iconName: item.iconName,
          iconUrl: item.iconUrl,
          type: 'module',
          model: item.model,
          description: item.description,
          childs: item.childs || []
        }))
      ];

      setMenuItems(sidebarItems);
      console.log('Elementos del sidebar cargados:', sidebarItems);
    } catch (error) {
      console.error('Error cargando menú del sidebar:', error);
      setError('Error cargando el menú: ' + error.message);

      // Solo hacer logout automático si es un error crítico de sesión
      if (error.message.includes('No se pudo restaurar la sesión') || error.message.includes('datos de sesión son inválidos')) {
        console.log('Error crítico de sesión, haciendo logout automático...');
        handleLogout();
        return;
      }

      // Fallback a menú básico
      setMenuItems([
        { id: 'dashboard', name: 'Dashboard', icon: '📊' },
        { id: 'sales', name: 'Ventas', icon: '💰' },
        { id: 'purchases', name: 'Compras', icon: '🛒' },
        { id: 'inventory', name: 'Inventario', icon: '📦' },
        { id: 'accounting', name: 'Contabilidad', icon: '📋' },
        { id: 'hr', name: 'Recursos Humanos', icon: '👥' },
        { id: 'settings', name: 'Configuración', icon: '⚙️' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await trytonService.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    }
    localStorage.removeItem('tryton_session');
    onLogout();
  };

  const clearPreviousState = () => {
    console.log('🧹 Limpiando estado anterior...');

    // Limpiar información del menú anterior
    setSelectedMenuInfo(null);

    // Limpiar datos de tabla y formulario
    setTableInfo(null);
    setFormInfo(null);

    // Limpiar wizard anterior
    setShowWizardModal(false);
    setWizardInfo(null);
    setWizardLoading(false);

    // Limpiar errores
    setError('');
  };

  const handleActionOptionSelect = async (selectedIndex, selectedOption) => {
    try {
      console.log(`Seleccionada opción ${selectedIndex}:`, selectedOption);

      // Cerrar el modal
      setShowActionOptionsModal(false);
      setActionOptions([]);

      // Si es una opción de res_model (tiene resModel), ejecutarla directamente
      if (selectedOption.resModel) {
        console.log(`🎯 Ejecutando opción de res_model: ${selectedOption.resModel}`);

        // Limpiar estado anterior
        clearPreviousState();

        // Ejecutar la opción de res_model
        const result = await trytonService.executeResModelOption(selectedOption);

        console.log('Resultado de la opción de res_model:', result);
        // Procesar el resultado
        if (result.tableData) {
          setTableInfo(result.tableData);
          setFormInfo(null);
        } else if (result.formData && result.viewType === 'form') {
          console.log('✅ Estableciendo TrytonForm con formInfo');
          setFormInfo(result.formData);
          setTableInfo(null);
        } else {
          console.log('⚠️ No hay datos válidos, limpiando tableInfo y formInfo');
          setTableInfo(null);
          setFormInfo(null);
        }

        // Luego establecer selectedMenuInfo con el viewType correcto
        setSelectedMenuInfo({
          menuItem: pendingMenuItem,
          actionInfo: [result],
          toolbarInfo: result.toolbarInfo,
          resModel: result.resModel,
          actionName: result.actionName,
          viewType: result.viewType,
          viewId: result.viewId,
          timestamp: new Date().toISOString()
        });

        setActiveTab(pendingMenuItem.id);
        setPendingMenuItem(null);

      } else {
        // Es una opción normal, ejecutar como antes
        // Limpiar estado anterior antes de procesar nueva selección
        clearPreviousState();

        // Ejecutar la acción seleccionada
        const result = await trytonService.executeSelectedAction(pendingMenuItem.id, selectedIndex);

        console.log('Resultado de la acción ejecutada:', result);

      // Procesar el resultado según el tipo de acción
      if (result.isWizard) {
        console.log('🧙 Wizard detectado:', result.wizardName);
        await handleWizardAction(result, pendingMenuItem);
        return;
      } else if (result.requiresContext) {
        console.log('⚠️ La acción requiere contexto:', result.contextModel);
        console.log('📋 Opciones de res_model disponibles:', result.resModelOptions);

        // Mostrar modal con opciones de res_model
        setActionOptions(result.resModelOptions);
        setPendingMenuItem(pendingMenuItem);
        setShowActionOptionsModal(true);
        return;
      }

        // Si es una acción directa, procesar como menú normal
        if (result.resModel && result.toolbarInfo) {
          await processDirectAction(pendingMenuItem, result);
        }

        setPendingMenuItem(null);
      }

    } catch (error) {
      console.error('Error ejecutando acción seleccionada:', error);
      setError('Error ejecutando la acción seleccionada: ' + error.message);
      setShowActionOptionsModal(false);
      setPendingMenuItem(null);
    }
  };

  const handleActionOptionsModalClose = () => {
    console.log('🚪 Cerrando modal de opciones de acción...');

    setShowActionOptionsModal(false);
    setActionOptions([]);
    setPendingMenuItem(null);

    // No limpiar el estado completo aquí, solo cerrar el modal
    // El usuario puede querer mantener la vista actual
  };

  const handleWizardAction = async (wizardResult) => {
    try {
      setWizardLoading(true);
      console.log('🧙 Iniciando wizard:', wizardResult.wizardName);

      // Crear el wizard
      const createResult = await trytonService.createWizard(wizardResult.wizardName);
      console.log('✅ Wizard creado:', createResult);

      // Obtener el formulario del wizard
      const wizardForm = await trytonService.getWizardForm(wizardResult.wizardName, createResult.wizardId);
      console.log('✅ Formulario de wizard obtenido:', wizardForm);

      // Configurar la información del wizard para el modal
      const wizardModalInfo = {
        ...wizardForm,
        wizardName: wizardResult.wizardName,
        wizardId: createResult.wizardId,
        title: wizardResult.actionName || 'Wizard'
      };

      setWizardInfo(wizardModalInfo);
      setShowWizardModal(true);

    } catch (error) {
      console.error('Error manejando wizard:', error);
      setError('Error iniciando wizard: ' + error.message);
    } finally {
      setWizardLoading(false);
    }
  };

  const handleWizardSubmit = async (values, buttonState) => {
    try {
      console.log('🧙 Enviando wizard:', { values, buttonState });

      // Ejecutar la acción del wizard
      const result = await trytonService.executeWizardAction(
        wizardInfo.wizardName,
        wizardInfo.wizardId,
        values,
        buttonState
      );

      console.log('✅ Wizard ejecutado:', result);

      // Si el wizard devuelve una vista, procesarla
      if (result && result.view) {
        const view = result.view;

        if (view.fields_view && view.fields_view.type === 'tree') {
          // Es una tabla
          setTableInfo({
            fieldsView: view.fields_view,
            data: view.values || [],
            model: view.fields_view.model,
            viewId: view.fields_view.view_id,
            viewType: 'tree',
            fields: Object.keys(view.fields_view.fields || {})
          });
          setFormInfo(null);
        } else if (view.fields_view && view.fields_view.type === 'form') {
          // Es un formulario
          setFormInfo({
            model: view.fields_view.model,
            viewId: view.fields_view.view_id,
            viewType: 'form',
            fieldsView: view.fields_view,
            recordData: view.values || null
          });
          setTableInfo(null);
        }

        setSelectedMenuInfo({
          menuItem: pendingMenuItem,
          actionInfo: [result],
          toolbarInfo: null,
          resModel: view.fields_view?.model,
          actionName: wizardInfo.title,
          viewType: view.fields_view?.type,
          viewId: view.fields_view?.view_id,
          timestamp: new Date().toISOString()
        });

        setActiveTab(pendingMenuItem.id);
      }

      // Limpiar el wizard
      await trytonService.deleteWizard(wizardInfo.wizardName, wizardInfo.wizardId);

    } catch (error) {
      console.error('Error enviando wizard:', error);
      setError('Error ejecutando wizard: ' + error.message);
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  const handleWizardCancel = async () => {
    try {
      console.log('🧙 Cancelando wizard...');

      // Eliminar el wizard
      await trytonService.deleteWizard(wizardInfo.wizardName, wizardInfo.wizardId);

      console.log('✅ Wizard cancelado y eliminado');

    } catch (error) {
      console.error('Error cancelando wizard:', error);
      // No re-lanzar el error, solo loggearlo
      // El modal se cerrará de todas formas
    }
  };

  const handleWizardModalClose = () => {
    console.log('🚪 Cerrando modal de wizard...');

    setShowWizardModal(false);
    setWizardInfo(null);
    setWizardLoading(false);
    setPendingMenuItem(null);
  };

  // Handlers para el Toolbar
  const handleToolbarNavigate = (action, value) => {
    console.log('Toolbar navigate:', action, value);
    // TODO: Implementar navegación entre registros
  };

  const handleToolbarCreate = async () => {
    try {
      console.log('🔧 Toolbar create clicked - cambiando a vista de formulario');
      
      if (!selectedMenuInfo || !selectedMenuInfo.resModel) {
        console.warn('No hay información del menú seleccionado');
        return;
      }

      setLoadingContent(true);

      const model = selectedMenuInfo.resModel;
      console.log(`📝 Creando nuevo registro para modelo: ${model}`);

      // PASO 1: Obtener vista de formulario
      console.log('🔍 Obteniendo vista de formulario...');
      const formFieldsView = await trytonService.getFieldsView(model, null, 'form');
      
      if (!formFieldsView) {
        throw new Error('No se pudo obtener la vista de formulario');
      }

      // PASO 2: Obtener valores por defecto
      console.log('🔍 Obteniendo valores por defecto...');
      const defaultValues = await trytonService.getDefaultValues(model);

      // PASO 3: Preparar datos del formulario
      const newFormData = {
        model: model,
        viewId: formFieldsView.view_id || null,
        viewType: 'form',
        fieldsView: formFieldsView,
        recordData: defaultValues, // Usar valores por defecto como datos iniciales
        isNew: true // Marcar como nuevo registro
      };

      console.log('✅ Datos del formulario preparados:', newFormData);

      // PASO 4: Cambiar a vista de formulario
      setFormInfo(newFormData);
      setTableInfo(null); // Limpiar tabla
      
      // PASO 5: Actualizar selectedMenuInfo para reflejar el cambio a formulario
      setSelectedMenuInfo({
        ...selectedMenuInfo,
        viewType: 'form',
        viewId: formFieldsView.view_id || null,
        formData: newFormData
      });

      console.log('✅ Cambio a vista de formulario completado');
      setLoadingContent(false);

    } catch (error) {
      console.error('Error creando nuevo registro:', error);
      setError('Error creando nuevo registro: ' + error.message);
      setLoadingContent(false);
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


  const processDirectAction = async (item, actionResult) => {
    try {
      // Actualizar el nombre del menú con la acción seleccionada
      let updatedItem = { ...item };
      if (actionResult.actionName) {
        updatedItem.name = actionResult.actionName;
        console.log(`🔄 Actualizando nombre del menú ${item.id} a "${actionResult.actionName}"`);

        // Actualizar el estado del menú con el nuevo nombre
        setMenuItems(prevItems => {
          const updateMenuItems = (items) => {
            return items.map(menuItem => {
              if (menuItem.id === item.id) {
                return { ...menuItem, name: actionResult.actionName };
              }
              if (menuItem.childs && menuItem.childs.length > 0) {
                return { ...menuItem, childs: updateMenuItems(menuItem.childs) };
              }
              return menuItem;
            });
          };
          return updateMenuItems(prevItems);
        });
      }

      // Procesar la vista y obtener datos como en el flujo normal
      let tableData = null;
      let formData = null;
      let viewType = null;
      let viewId = null;

      if (actionResult.views && actionResult.views.length > 0) {
        // Buscar vista tree primero, luego form
        const treeView = actionResult.views.find(view => view[1] === 'tree');
        const formView = actionResult.views.find(view => view[1] === 'form');

        // Priorizar tree view si existe, sino usar form view
        const selectedView = treeView || formView || actionResult.views[0];
        viewId = selectedView[0];
        viewType = selectedView[1];

        console.log(`🔍 Obteniendo información de vista para modelo: ${actionResult.resModel}, vista: ${viewId}, tipo: ${viewType}`);

        try {
          // Verificar el tipo de vista
          const fieldsView = await trytonService.getFieldsView(
            actionResult.resModel,
            viewId,
            viewType
          );

          console.log('🔍 Vista obtenida:', fieldsView);

          // Usar el tipo real de la vista que devuelve Tryton
          const realViewType = fieldsView.type;
          viewType = realViewType; // Actualizar viewType con el tipo real

          if (realViewType === 'tree') {
            console.log('✅ Vista confirmada como tipo "tree", obteniendo datos...');
            console.log(`🔍 Parámetros: resModel=${actionResult.resModel}, viewId=${viewId}`);

            // Solo llamar a getTableInfo si tenemos un viewId válido
            if (viewId) {
              tableData = await trytonService.getTableInfo(
                actionResult.resModel,
                viewId,
                'tree',
                [],
                100
              );
              console.log('✅ Información de tabla obtenida:', tableData);
            } else {
              console.warn('⚠️ No hay viewId disponible, no se puede obtener información de tabla');
            }
          } else if (realViewType === 'form') {
            console.log('✅ Vista confirmada como tipo "form", preparando formulario...');

            // Para formularios, necesitamos obtener los datos del registro
            let recordData = null;
            try {
              console.log('🔍 Intentando obtener datos del registro...');
              const recordId = 1; // Para configuraciones, generalmente es el registro 1
              const fields = Object.keys(fieldsView.fields || {});
              // Expandir campos para incluir many2one.rec_name
              const expandedFields = trytonService.expandFieldsForRelationsFromFieldsView(fields, fieldsView);
              console.log('🔍 Campos expandidos para formulario:', expandedFields);
              recordData = await trytonService.getFormRecordData(
                actionResult.resModel,
                recordId,
                expandedFields
              );

              if (recordData) {
                console.log('✅ Datos del registro obtenidos:', recordData);
              } else {
                console.log('⚠️ No se encontraron datos del registro, creando formulario vacío');
              }
            } catch (recordError) {
              console.warn('⚠️ Error obteniendo datos del registro:', recordError);
              // Continuar con formulario vacío
            }

            formData = {
              model: actionResult.resModel,
              viewId: viewId,
              viewType: 'form',
              fieldsView: fieldsView,
              recordData: recordData
            };
            console.log('✅ Información de formulario preparada:', formData);
          } else {
            console.log(`⚠️ Vista no es de tipo "tree" ni "form" (tipo: ${fieldsView?.type}), omitiendo`);
          }
        } catch (viewError) {
          console.warn('⚠️ Error obteniendo información de vista:', viewError);
        }
      }

      // Establecer primero tableInfo o formInfo basado en el tipo real de vista
      console.log(`📊 Estableciendo estado de vista: tipo="${viewType}", tableData=${!!tableData}, formData=${!!formData}`);

      if (viewType === 'tree' && tableData) {
        console.log('✅ Estableciendo TrytonTable con tableInfo');
        setTableInfo(tableData);
        setFormInfo(null);
      } else if (viewType === 'form' && formData) {
        console.log('✅ Estableciendo TrytonForm con formInfo');
        setFormInfo(formData);
        setTableInfo(null);
      } else {
        // Si no hay datos válidos, limpiar ambos
        console.log('⚠️ No hay datos válidos, limpiando tableInfo y formInfo');
        setTableInfo(null);
        setFormInfo(null);
      }

      // Luego establecer selectedMenuInfo con el viewType correcto
      setSelectedMenuInfo({
        menuItem: updatedItem,
        actionInfo: [actionResult],
        toolbarInfo: actionResult.toolbarInfo,
        resModel: actionResult.resModel,
        actionName: actionResult.actionName,
        viewType: viewType,
        viewId: viewId,
        timestamp: new Date().toISOString()
      });

      setActiveTab(item.id);

    } catch (error) {
      console.error('Error procesando acción directa:', error);
      setError('Error procesando la acción: ' + error.message);
    }
  };

  const toggleMenuExpansion = (menuId) => {
    const newExpandedMenus = new Set(expandedMenus);
    if (newExpandedMenus.has(menuId)) {
      newExpandedMenus.delete(menuId);
    } else {
      newExpandedMenus.add(menuId);
    }
    setExpandedMenus(newExpandedMenus);
  };

  const handleMenuClick = async (item) => {
    try {
      // Si es el dashboard, no hacer llamada RPC
      if (item.id === 'dashboard') {
        setActiveTab(item.id);
        setSelectedMenuInfo(null);
        setLoadingContent(false);
        return;
      }

      // Si el item tiene hijos, solo expandir/colapsar
      const hasChildren = item.childs && item.childs.length > 0;
      if (hasChildren) {
        toggleMenuExpansion(item.id);
        return;
      }

      // Cambiar inmediatamente el tab y mostrar loading
      setActiveTab(item.id);
      setLoadingContent(true);

      // Limpiar estado anterior antes de procesar menú
      setSelectedMenuInfo(null);
      setTableInfo(null);
      setFormInfo(null);
      setShowWizardModal(false);
      setWizardInfo(null);
      setWizardLoading(false);
      setError('');

      // Usar el método del servicio para obtener la información del menú
      const menuInfo = await trytonService.getMenuActionInfo(item.id);

      console.log('Información del menú obtenida:', menuInfo);

      // Si es un wizard, manejarlo directamente
      if (menuInfo.isWizard) {
        console.log('🧙 Wizard detectado en handleMenuClick:', menuInfo.wizardName);
        setLoadingContent(false);
        await handleWizardAction(menuInfo);
        return;
      }

      // Si hay múltiples opciones, mostrar el modal
      if (menuInfo.hasMultipleOptions && menuInfo.options && menuInfo.options.length > 1) {
        console.log('⚠️ Múltiples opciones detectadas, mostrando modal de selección');

        // Limpiar estado anterior antes de mostrar modal
        clearPreviousState();

        setActionOptions(menuInfo.options);
        setPendingMenuItem(item);
        setShowActionOptionsModal(true);
        setLoadingContent(false);
        return;
      }

      // Actualizar el nombre del menú si se obtuvo un actionName
      let updatedItem = { ...item };
      if (menuInfo.actionName) {
        updatedItem.name = menuInfo.actionName;
        console.log(`🔄 Actualizando nombre del menú ${item.id} de "${item.name}" a "${menuInfo.actionName}"`);

        // Actualizar el estado del menú con el nuevo nombre
        setMenuItems(prevItems => {
          const updateMenuItems = (items) => {
            return items.map(menuItem => {
              if (menuItem.id === item.id) {
                return { ...menuItem, name: menuInfo.actionName };
              }
              if (menuItem.childs && menuItem.childs.length > 0) {
                return { ...menuItem, childs: updateMenuItems(menuItem.childs) };
              }
              return menuItem;
            });
          };
          return updateMenuItems(prevItems);
        });
      }

      // Si tenemos un modelo, obtener información de la vista (tree o form)
      let tableData = null;
      let formData = null;
      let viewType = null;
      let viewId = null;

      if (menuInfo.resModel && menuInfo.actionInfo && menuInfo.actionInfo.length > 0) {
        console.log(`🔍 Procesando menuInfo para modelo: ${menuInfo.resModel}`);
        console.log(`🔍 menuInfo completo:`, {
          hasFieldsView: !!menuInfo.fieldsView,
          viewType: menuInfo.viewType,
          viewId: menuInfo.viewId,
          fieldsViewType: menuInfo.fieldsView?.type
        });

        // Si ya tenemos la vista de campos del servicio, usarla
        if (menuInfo.fieldsView && menuInfo.viewType) {
          console.log(`🔍 Usando vista de campos ya obtenida: ${menuInfo.viewType}, ID: ${menuInfo.viewId}`);
          console.log(`🔍 Tipo real de la vista: ${menuInfo.fieldsView.type}`);

          // Usar el tipo real de la vista, no el que establece el servicio
          const realViewType = menuInfo.fieldsView.type || menuInfo.viewType;
          viewType = realViewType; // Actualizar viewType con el tipo real

          console.log(`🔍 Comparando tipos: servicio dice "${menuInfo.viewType}", Tryton dice "${menuInfo.fieldsView.type}", usando "${realViewType}"`);

          if (realViewType === 'tree') {
            console.log('✅ Vista confirmada como tipo "tree", obteniendo datos...');
            console.log(`🔍 Parámetros: resModel=${menuInfo.resModel}, viewId=${menuInfo.viewId}`);

            // Solo llamar a getTableInfo si tenemos un viewId válido
            if (menuInfo.viewId) {
              tableData = await trytonService.getTableInfo(
                menuInfo.resModel,
                menuInfo.viewId,
                'tree',
                [],
                100
              );
              console.log('✅ Información de tabla obtenida:', tableData);
            } else {
              console.warn('⚠️ No hay viewId disponible, no se puede obtener información de tabla');
            }
          } else if (realViewType === 'form') {
            console.log('✅ Vista confirmada como tipo "form", preparando formulario...');

            // Para formularios, necesitamos obtener los datos del registro
            let recordData = null;
            try {
              console.log('🔍 Intentando obtener datos del registro...');
              const recordId = 1; // Para configuraciones, generalmente es el registro 1
              const fields = Object.keys(menuInfo.fieldsView.fields || {});
              // Expandir campos para incluir many2one.rec_name
              const expandedFields = trytonService.expandFieldsForRelationsFromFieldsView(fields, menuInfo.fieldsView);
              console.log('🔍 Campos expandidos para formulario:', expandedFields);
              recordData = await trytonService.getFormRecordData(
                menuInfo.resModel,
                recordId,
                expandedFields
              );

              if (recordData) {
                console.log('✅ Datos del registro obtenidos:', recordData);
              } else {
                console.log('⚠️ No se encontraron datos del registro, creando formulario vacío');
              }
            } catch (recordError) {
              console.warn('⚠️ Error obteniendo datos del registro:', recordError);
              // Continuar con formulario vacío
            }

            formData = {
              model: menuInfo.resModel,
              viewId: menuInfo.viewId,
              viewType: 'form',
              fieldsView: menuInfo.fieldsView,
              recordData: recordData
            };
            console.log('✅ Información de formulario preparada:', formData);
            console.log('🔍 recordData que se pasa a TrytonForm:', recordData);
          }
        } else {
          // Fallback al método anterior si no tenemos la vista de campos
          const actionData = menuInfo.actionInfo[0];
          if (actionData.views && actionData.views.length > 0) {
            // Buscar vista tree primero, luego form
            const treeView = actionData.views.find(view => view[1] === 'tree');
            const formView = actionData.views.find(view => view[1] === 'form');

            // Priorizar tree view si existe, sino usar form view
            const selectedView = treeView || formView || actionData.views[0];
            viewId = selectedView[0];
            viewType = selectedView[1];

            console.log(`🔍 Obteniendo información de vista para modelo: ${menuInfo.resModel}, vista: ${viewId}, tipo: ${viewType}`);

            try {
              // Verificar el tipo de vista
              const fieldsView = await trytonService.getFieldsView(
                menuInfo.resModel,
                viewId,
                viewType
              );

              console.log('🔍 Vista obtenida:', fieldsView);

              // Usar el tipo real de la vista que devuelve Tryton
              const realViewType = fieldsView.type;
              viewType = realViewType; // Actualizar viewType con el tipo real

              if (realViewType === 'tree') {
                console.log('✅ Vista confirmada como tipo "tree", obteniendo datos...');
                console.log(`🔍 Parámetros: resModel=${menuInfo.resModel}, viewId=${viewId}`);

                // Solo llamar a getTableInfo si tenemos un viewId válido
                if (viewId) {
                  tableData = await trytonService.getTableInfo(
                    menuInfo.resModel,
                    viewId,
                    'tree',
                    [],
                    100
                  );
                  console.log('✅ Información de tabla obtenida:', tableData);
                } else {
                  console.warn('⚠️ No hay viewId disponible, no se puede obtener información de tabla');
                }
              } else if (realViewType === 'form') {
                console.log('✅ Vista confirmada como tipo "form", preparando formulario...');

            // Para formularios, necesitamos obtener los datos del registro
            let recordData = null;
            try {
              console.log('🔍 Intentando obtener datos del registro...');
              const recordId = 1; // Para configuraciones, generalmente es el registro 1
              const fields = Object.keys(menuInfo.fieldsView.fields || {});
              // Expandir campos para incluir many2one.rec_name
              const expandedFields = trytonService.expandFieldsForRelationsFromFieldsView(fields, menuInfo.fieldsView);
              console.log('🔍 Campos expandidos para formulario:', expandedFields);
              recordData = await trytonService.getFormRecordData(
                menuInfo.resModel,
                recordId,
                expandedFields
              );

                  if (recordData) {
                    console.log('✅ Datos del registro obtenidos:', recordData);
                  } else {
                    console.log('⚠️ No se encontraron datos del registro, creando formulario vacío');
                  }
                } catch (recordError) {
                  console.warn('⚠️ Error obteniendo datos del registro:', recordError);
                  // Continuar con formulario vacío
                }

                formData = {
                  model: menuInfo.resModel,
                  viewId: viewId,
                  viewType: 'form',
                  fieldsView: fieldsView,
                  recordData: recordData
                };
                console.log('✅ Información de formulario preparada:', formData);
              } else {
                console.log(`⚠️ Vista no es de tipo "tree" ni "form" (tipo: ${fieldsView?.type}), omitiendo`);
              }
            } catch (viewError) {
              console.warn('⚠️ Error obteniendo información de vista:', viewError);
            }
          }
        }
      }

      // Establecer primero tableInfo o formInfo basado en el tipo real de vista
      console.log(`📊 Estableciendo estado de vista: tipo="${viewType}", tableData=${!!tableData}, formData=${!!formData}`);

      if (viewType === 'tree' && tableData) {
        console.log('✅ Estableciendo TrytonTable con tableInfo');
        setTableInfo(tableData);
        setFormInfo(null);
      } else if (viewType === 'form' && formData) {
        console.log('✅ Estableciendo TrytonForm con formInfo');
        setFormInfo(formData);
        setTableInfo(null);
      } else {
        // Si no hay datos válidos, limpiar ambos
        console.log('⚠️ No hay datos válidos, limpiando tableInfo y formInfo');
        setTableInfo(null);
        setFormInfo(null);
      }

      // Luego establecer selectedMenuInfo con el viewType correcto
      setSelectedMenuInfo({
        menuItem: updatedItem,
        actionInfo: menuInfo.actionInfo,
        toolbarInfo: menuInfo.toolbarInfo,
        resModel: menuInfo.resModel,
        actionName: menuInfo.actionName,
        viewType: viewType,
        viewId: viewId,
        timestamp: new Date().toISOString()
      });

      setActiveTab(item.id);
      setLoadingContent(false);
    } catch (error) {
      console.error('Error obteniendo información del menú:', error);
      setSelectedMenuInfo({
        menuItem: item,
        actionInfo: null,
        toolbarInfo: null,
        resModel: null,
        actionName: null,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      setLoadingContent(false);
    }
  };

  const getIconComponent = (item) => {
    // Si el item tiene iconUrl (SVG del backend), usarlo
    if (item?.iconUrl) {
      return (
        <img
          src={item.iconUrl}
          alt={item.name || 'icon'}
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'contain'
          }}
        />
      );
    }

    // Fallback a iconos por defecto si no hay iconUrl
    const iconMap = {
      '📊': BarChart3,
      '💰': DollarSign,
      '🛒': ShoppingCart,
      '📦': Package,
      '📋': ClipboardList,
      '👥': Users,
      '⚙️': Settings,
      '❤️': Heart,
      '👨‍⚕️': Stethoscope,
      '📅': Calendar,
      '💊': Pill,
      '🏥': Hospital,
      '🔐': Shield,
      '👤': User,
      '🏢': Building2,
      '📄': FileText,
      '🔍': SearchOutlined,
      '📈': Activity
    };

    // Si es un emoji, usar el mapeo
    if (item?.icon && iconMap[item.icon]) {
      const IconComponent = iconMap[item.icon];
      return <IconComponent size={20} />;
    }

    // Si es un nombre específico, mapear por nombre
    const nameMap = {
      'Health': Heart,
      'Sales': DollarSign,
      'Purchase': ShoppingCart,
      'Inventory': Package,
      'Accounting': FileText,
      'HR': Users,
      'Settings': Settings,
      'Dashboard': BarChart3,
      'Patient': Heart,
      'Doctor': Stethoscope,
      'Appointment': Calendar,
      'Medicine': Pill,
      'Department': Building2,
      'Report': BarChart3
    };

    if (item?.name && nameMap[item.name]) {
      const IconComponent = nameMap[item.name];
      return <IconComponent size={20} />;
    }

    // Fallback por defecto
    return <FileText size={16} />;
  };

  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.childs && item.childs.length > 0;
    const isExpanded = expandedMenus.has(item.id);
    const isActive = activeTab === item.id;
    const isChild = level > 0;

    return (
      <div key={item.id} style={{ marginBottom: '2px' }}>
        <div style={{
          marginLeft: isChild && sidebarOpen ? '20px' : '0',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            {/* Flecha indicadora para elementos hijo */}
            {isChild && sidebarOpen && (
              <div style={{
                marginRight: '8px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px'
              }}>
                →
              </div>
            )}

            {/* Botón principal del menú */}
            <Button
              type={isActive ? 'primary' : 'text'}
              onClick={() => {
                handleMenuClick(item);
              }}
              style={{
                flex: 1,
                height: 'auto',
                padding: sidebarOpen ? '12px 16px' : '12px 8px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                background: isActive ? '#007BFF' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: isActive ? 'white' : 'white',
                minHeight: '40px',
                position: 'relative',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
              title={sidebarOpen ? (item.description || item.name) : item.name}
            >
              {sidebarOpen ? (
                <Space style={{ width: '100%', minWidth: 0 }}>
                  {getIconComponent(item)}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    minWidth: 0,
                    flex: 1
                  }}>
                    <Text
                      style={{
                        fontSize: '14px',
                        fontWeight: isChild ? '400' : '500',
                        color: isActive ? 'white' : 'white',
                        wordBreak: 'break-word',
                        lineHeight: '1.3'
                      }}
                      ellipsis={{ tooltip: true }}
                    >
                      {item.name}
                    </Text>
                    {item.type === 'module' && item.model && (
                      <Text
                        style={{
                          fontSize: '12px',
                          opacity: 0.7,
                          color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                          wordBreak: 'break-word',
                          lineHeight: '1.2'
                        }}
                        ellipsis={{ tooltip: true }}
                      >
                        {item.model}
                      </Text>
                    )}
                  </div>
                </Space>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {getIconComponent(item)}
                </div>
              )}
            </Button>

            {/* Botón de expansión (solo si tiene hijos y el sidebar está abierto) */}
            {hasChildren && sidebarOpen && (
              <Button
                type="text"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenuExpansion(item.id);
                }}
                style={{
                  marginLeft: '4px',
                  padding: '4px 8px',
                  minWidth: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? 'white' : 'white',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px'
                }}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
              </Button>
            )}
          </div>

          {/* Contenedor de hijos */}
          {hasChildren && isExpanded && sidebarOpen && (
            <div style={{ marginTop: '4px' }}>
              {item.childs.map((child) => renderMenuItem(
                child,
                level + 1
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
            <div style={{
              padding: '24px',
              background: '#F8F9FA',
              minHeight: 'calc(100vh - 64px)',
              overflowY: 'auto'
            }}>
            <div style={{ marginBottom: '32px' }}>
              <Title level={2} style={{ margin: 0, color: '#333333' }}>
                Dashboard
              </Title>
              <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
                Current session information
              </Paragraph>
            </div>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <Title level={3} style={{ marginBottom: '16px' }}>Session Information</Title>

              <div style={{ lineHeight: '1.8' }}>
                <p><strong>User:</strong> {sessionData.username}</p>
                <p><strong>Database:</strong> {sessionData.database}</p>
                <p><strong>User ID:</strong> {sessionData.userId}</p>
                <p><strong>Status:</strong> Active</p>
                <p><strong>Login Time:</strong> {new Date(sessionData.loginTime).toLocaleString()}</p>
              </div>
            </div>
          </div>
        );
      default: {
        // Si está cargando contenido, mostrar spinner
        if (loadingContent) {
          return (
            <div style={{
              padding: '24px',
              background: '#F8F9FA',
              minHeight: 'calc(100vh - 64px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <Spin size="large" />
              <Text style={{ marginTop: '16px', color: '#6C757D' }}>
                Loading content...
              </Text>
            </div>
          );

        }

        // Buscar el elemento seleccionado en todos los niveles
        const findSelectedItem = (items, targetId) => {
          for (const item of items) {
            if (item.id === targetId) {
              return item;
            }
            if (item.childs && item.childs.length > 0) {
              const found = findSelectedItem(item.childs, targetId);
              if (found) return found;
            }
          }
          return null;
        };

        const selectedItem = findSelectedItem(menuItems, activeTab);

        // Log del estado actual para debugging
        console.log(`🎨 Renderizando contenido: activeTab=${activeTab}`);
        console.log(`📊 Estado actual:`, {
          hasTableInfo: !!tableInfo,
          hasFormInfo: !!formInfo,
          hasSelectedMenuInfo: !!selectedMenuInfo,
          viewType: selectedMenuInfo?.viewType,
          resModel: selectedMenuInfo?.resModel,
          loadingContent: loadingContent
        });
        
        console.log(`🔍 Condiciones para renderizar tabla:`, {
          'tableInfo exists': !!tableInfo,
          'selectedMenuInfo exists': !!selectedMenuInfo,
          'resModel exists': !!selectedMenuInfo?.resModel,
          'viewType is tree': selectedMenuInfo?.viewType === 'tree',
          'all conditions met': !!(tableInfo && selectedMenuInfo && selectedMenuInfo.resModel && selectedMenuInfo.viewType === 'tree')
        });

        // Si hay información de tabla, mostrar la tabla Tryton
        if (tableInfo && selectedMenuInfo && selectedMenuInfo.resModel && selectedMenuInfo.viewType === 'tree') {
          console.log('✅ Renderizando TrytonTable con viewId:', tableInfo.viewId);

          return (
            <div style={{
              background: '#F8F9FA',
              minHeight: 'calc(100vh - 64px)',
              overflowY: 'auto'
            }}>
              <div style={{ padding: '24px' }}>
                {/* Header con título y toolbar alineados horizontalmente */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <Title level={2} style={{ margin: 0, color: '#333333' }}>
                      {selectedMenuInfo.actionName || selectedItem?.name || 'Table'}
                    </Title>
                    <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
                      {selectedMenuInfo.resModel} - Table view
                    </Paragraph>
                  </div>
                  
                  {/* Toolbar al lado del título */}
                  {selectedMenuInfo.toolbarInfo && (
                    <div style={{ flexShrink: 0 }}>
                      <Toolbar
                        toolbarInfo={selectedMenuInfo.toolbarInfo}
                        currentRecord={1}
                        totalRecords={1}
                        onNavigate={handleToolbarNavigate}
                        onCreate={handleToolbarCreate}
                        onSave={handleToolbarSave}
                        onRefresh={handleToolbarRefresh}
                        onAttach={handleToolbarAttach}
                        onComment={handleToolbarComment}
                        onAction={handleToolbarAction}
                        onRelate={handleToolbarRelate}
                        onPrint={handleToolbarPrint}
                        onEmail={handleToolbarEmail}
                        loading={loadingContent}
                      />
                    </div>
                  )}
                </div>

                <TrytonTable
                  model={tableInfo.model}
                  viewId={tableInfo.viewId}
                  viewType={tableInfo.viewType}
                  domain={[]}
                  limit={100}
                  title={selectedMenuInfo.actionName}
                />
              </div>
            </div>
          );
        }

        // Si hay información de formulario, mostrar el formulario Tryton
        if (formInfo && selectedMenuInfo && selectedMenuInfo.resModel && selectedMenuInfo.viewType === 'form') {
          console.log('✅ Renderizando TrytonForm');

          return (
            <div style={{
              background: '#F8F9FA',
              minHeight: 'calc(100vh - 64px)',
              overflowY: 'auto'
            }}>
              <div style={{ padding: '24px' }}>
                {/* Header con título y toolbar alineados horizontalmente */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <Title level={2} style={{ margin: 0, color: '#333333' }}>
                      {formInfo.isNew ? 'Crear nuevo registro' : selectedMenuInfo.actionName || selectedItem?.name || 'Form'}
                    </Title>
                    <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
                      {selectedMenuInfo.resModel} - {formInfo.isNew ? 'Nuevo registro' : 'Form view'}
                    </Paragraph>
                  </div>
                  
                  {/* Toolbar al lado del título */}
                  {selectedMenuInfo.toolbarInfo && (
                    <div style={{ flexShrink: 0 }}>
                      <Toolbar
                        toolbarInfo={selectedMenuInfo.toolbarInfo}
                        currentRecord={formInfo.recordData?.id || 1}
                        totalRecords={1}
                        onNavigate={handleToolbarNavigate}
                        onCreate={handleToolbarCreate}
                        onSave={handleToolbarSave}
                        onRefresh={handleToolbarRefresh}
                        onAttach={handleToolbarAttach}
                        onComment={handleToolbarComment}
                        onAction={handleToolbarAction}
                        onRelate={handleToolbarRelate}
                        onPrint={handleToolbarPrint}
                        onEmail={handleToolbarEmail}
                        loading={loadingContent}
                      />
                    </div>
                  )}
                </div>

                <TrytonForm
                  model={formInfo.model}
                  viewId={formInfo.viewId}
                  viewType={selectedMenuInfo.viewType}
                  recordId={formInfo.recordData?.id || null}
                  recordData={formInfo.recordData}
                  fieldsView={formInfo.fieldsView}
                  title={selectedMenuInfo.actionName}
                />
              </div>
            </div>
          );
        }

        // Si hay información del menú seleccionado, mostrar el JSON
        if (selectedMenuInfo) {
          return (
            <div style={{
              padding: '24px',
              background: '#F8F9FA',
              minHeight: 'calc(100vh - 64px)',
              overflowY: 'auto'
            }}>
              <div style={{ marginBottom: '32px' }}>
                <Title level={2} style={{ margin: 0, color: '#333333' }}>
                  Menu Information
                </Title>
                <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
                  Details of the selected menu action
                </Paragraph>
              </div>

              <Row gutter={[24, 24]}>
                <Col xs={24} lg={8}>
                  <Card
                    title="Menu Information"
                    style={{ borderRadius: '12px' }}
                    bodyStyle={{ padding: '24px' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Menu ID</Text>
                        <Tag color="blue">{selectedMenuInfo.menuItem.id}</Tag>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Name</Text>
                        <Text strong>{selectedMenuInfo.actionName || selectedMenuInfo.menuItem.name}</Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Model</Text>
                        <Text strong>{selectedMenuInfo.menuItem.model || 'N/A'}</Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Res Model</Text>
                        <Tag color="green">{selectedMenuInfo.resModel || 'N/A'}</Tag>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Timestamp</Text>
                        <Text strong>{new Date(selectedMenuInfo.timestamp).toLocaleString()}</Text>
                      </div>
                      {selectedMenuInfo.error && (
                        <>
                          <Divider style={{ margin: '8px 0' }} />
                          <Alert
                            message="Error"
                            description={selectedMenuInfo.error}
                            type="error"
                            showIcon
                          />
                        </>
                      )}
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} lg={8}>
                  <Card
                    title="Toolbar"
                    style={{ borderRadius: '12px' }}
                    bodyStyle={{ padding: '0' }}
                  >
                    {selectedMenuInfo.toolbarInfo ? (
                      <Toolbar
                        toolbarInfo={selectedMenuInfo.toolbarInfo}
                        currentRecord={1}
                        totalRecords={1}
                        onNavigate={handleToolbarNavigate}
                        onCreate={handleToolbarCreate}
                        onSave={handleToolbarSave}
                        onRefresh={handleToolbarRefresh}
                        onAttach={handleToolbarAttach}
                        onComment={handleToolbarComment}
                        onAction={handleToolbarAction}
                        onRelate={handleToolbarRelate}
                        onPrint={handleToolbarPrint}
                        onEmail={handleToolbarEmail}
                        loading={loadingContent}
                      />
                    ) : (
                      <div style={{ padding: '24px' }}>
                        <Alert
                          message="No hay información de toolbar"
                          description="Este menú no tiene información de toolbar disponible"
                          type="info"
                          showIcon
                        />
                      </div>
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={8}>
                  <Card
                    title="Respuesta RPC (JSON)"
                    style={{ borderRadius: '12px' }}
                    bodyStyle={{ padding: '24px' }}
                  >
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '16px',
                      maxHeight: '500px',
                      overflowY: 'auto'
                    }}>
                      <pre style={{
                        margin: 0,
                        fontSize: '12px',
                        lineHeight: '1.4',
                        color: '#495057',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {JSON.stringify(selectedMenuInfo.actionInfo, null, 2)}
                      </pre>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          );
        }

        return (
          <div style={{
            padding: '24px',
            background: '#F8F9FA',
            minHeight: 'calc(100vh - 64px)',
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: '32px' }}>
                <Title level={2} style={{ margin: 0, color: '#333333' }}>
                  {selectedItem?.name || 'Módulo'}
                </Title>
                <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
                  Gestión de {selectedItem?.name}
                </Paragraph>
            </div>

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={16}>
                <Card
                  style={{ borderRadius: '12px' }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: '#00A88E',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px',
                      color: 'white'
                    }}>
                      {getIconComponent(selectedItem)}
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        {selectedItem?.name}
                      </Title>
                      <Text type="secondary">
                        {selectedItem?.type === 'module' ? 'Módulo del sistema' : 'Funcionalidad del sistema'}
                      </Text>
                    </div>
                  </div>

                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {selectedItem?.type === 'module' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary">Modelo</Text>
                          <Tag color="blue">{selectedItem.model || 'N/A'}</Tag>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">ID</Text>
                      <Tag color="default">{selectedItem?.id}</Tag>
                    </div>

                    {selectedItem?.description && (
                      <>
                        <Divider style={{ margin: '8px 0' }} />
                        <div>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                            Descripción
                          </Text>
                          <Card
                            size="small"
                            style={{ background: '#fafafa' }}
                            bodyStyle={{ padding: '12px' }}
                          >
                            <Text>{selectedItem.description}</Text>
                          </Card>
                        </div>
                      </>
                    )}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Card
                    title="Estado del Módulo"
                    style={{ borderRadius: '12px' }}
                    bodyStyle={{ padding: '24px' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Estado</Text>
                        <Tag color="orange">En desarrollo</Tag>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Versión</Text>
                        <Text strong>1.0.0</Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Última actualización</Text>
                        <Text strong>Hoy</Text>
                      </div>
                    </Space>
                  </Card>

                  <Card
                    title="Acciones"
                    style={{ borderRadius: '12px' }}
                    bodyStyle={{ padding: '24px' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <Button type="primary" block icon={<Settings size={16} />}>
                        Configurar
                      </Button>
                      <Button block icon={<FileText size={16} />}>
                        Ver documentación
                      </Button>
                    </Space>
                  </Card>
                </Space>
              </Col>
            </Row>
          </div>
        );
      }
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Header style={{
        background: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: '64px',
        borderBottom: '1px solid #E0E7EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              color: '#333333',
              marginRight: '16px',
              fontSize: '18px'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#00A88E',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px'
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>T</span>
            </div>
            <Title level={4} style={{ color: '#333333', margin: 0 }}>
              Tryton Management System
            </Title>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Search
            placeholder="Search in the system..."
            prefix={<SearchOutlined style={{ color: '#6C757D' }} />}
            style={{
              width: 320,
              background: '#F8F9FA',
              border: '1px solid #E0E7EB',
              color: '#333333',
              borderRadius: '8px'
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#F8F9FA',
              borderRadius: '8px',
              border: '1px solid #E0E7EB'
            }}>
              <Avatar
                style={{
                  background: '#00A88E',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {sessionData.username.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text style={{ color: '#333333', fontSize: '13px', fontWeight: '500', lineHeight: '1.2' }}>
                  {sessionData.username}
                </Text>
                <Text style={{ color: '#6C757D', fontSize: '11px', lineHeight: '1.2' }}>
                  {sessionData.database}
                </Text>
              </div>
            </div>
            <Tooltip title="Sign out">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{
                  color: '#6C757D',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid #E0E7EB',
                  background: '#F8F9FA'
                }}
              />
            </Tooltip>
          </div>
        </div>
      </Header>

      <Layout>
        {/* Sidebar */}
        <Sider
          trigger={null}
          collapsible
          collapsed={!sidebarOpen}
          width={320}
          collapsedWidth={80}
          breakpoint="lg"
          onBreakpoint={(broken) => {
            if (broken) {
              setSidebarOpen(false);
            }
          }}
          style={{
            background: '#00A88E',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            zIndex: 100,
            overflow: 'hidden'
          }}
        >
          <div
            className="sidebar-scroll"
            style={{
              padding: sidebarOpen ? '16px' : '8px',
              paddingTop: '80px', // Espacio para el header
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto', // Scroll cuando sea necesario
              scrollbarWidth: 'thin', // Firefox
              scrollbarColor: 'rgba(255,255,255,0.3) transparent' // Firefox
            }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 0',
                flexDirection: sidebarOpen ? 'row' : 'column'
              }}>
                <Spin size="large" />
                {sidebarOpen && (
                  <Text style={{ color: 'white', marginLeft: '12px' }}>
                    Loading menu...
                  </Text>
                )}
              </div>
            ) : error ? (
              <Alert
                message={sidebarOpen ? "Error" : ""}
                description={sidebarOpen ? error : ""}
                type="error"
                showIcon={sidebarOpen}
                style={{ marginBottom: '16px' }}
                action={sidebarOpen ? (
                  <Button size="small" onClick={loadSidebarMenu}>
                    Reintentar
                  </Button>
                ) : null}
              />
            ) : null}

            <div style={{
              marginTop: '16px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px' // Espaciado consistente entre elementos
            }}>
              {menuItems.map((item) => renderMenuItem(item))}
            </div>

          </div>
        </Sider>

        {/* Main Content */}
        <Content style={{
          marginLeft: sidebarOpen ? '320px' : '80px',
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
          background: '#F8F9FA',
          paddingTop: '64px' // Solo padding para el header
        }}>
          {renderContent()}
        </Content>
      </Layout>

      {/* Modal de selección de opciones de acción */}
      <ActionOptionsModal
        isOpen={showActionOptionsModal}
        onClose={handleActionOptionsModalClose}
        options={actionOptions}
        onSelectOption={handleActionOptionSelect}
        title="Seleccionar Acción"
        description="Este menú tiene múltiples opciones disponibles. Selecciona una para continuar:"
      />

      <WizardModal
        visible={showWizardModal}
        onClose={handleWizardModalClose}
        onCancel={handleWizardCancel}
        onSubmit={handleWizardSubmit}
        wizardInfo={wizardInfo}
        loading={wizardLoading}
        title={wizardInfo?.title || "Wizard"}
      />
    </Layout>
  );
};

export default Dashboard;

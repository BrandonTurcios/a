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
  RightOutlined,
  HeartOutlined,
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  BankOutlined,
  BarChartOutlined,
  SafetyOutlined,
  DatabaseOutlined,
  SettingOutlined,
  FileTextOutlined,
  ActivityOutlined,
  TeamOutlined,
  StethoscopeOutlined,
  HospitalOutlined,
  UnorderedListOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  InboxOutlined
} from '@ant-design/icons';
import trytonService from '../services/trytonService';
import PatientsTable from './PatientsTable';

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

  useEffect(() => {
    loadSidebarMenu();
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
          label: 'Dashboard', 
          icon: '📊', 
          type: 'dashboard',
          modelAccessCount: result.modelAccess?.length || 0,
          childs: []
        },
        ...result.menuItems.map(item => ({
          id: item.id,
          label: item.name,
          icon: item.icon,
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
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'sales', label: 'Ventas', icon: '💰' },
        { id: 'purchases', label: 'Compras', icon: '🛒' },
        { id: 'inventory', label: 'Inventario', icon: '📦' },
        { id: 'accounting', label: 'Contabilidad', icon: '📋' },
        { id: 'hr', label: 'Recursos Humanos', icon: '👥' },
        { id: 'settings', label: 'Configuración', icon: '⚙️' }
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

  const toggleMenuExpansion = (menuId) => {
    const newExpandedMenus = new Set(expandedMenus);
    if (newExpandedMenus.has(menuId)) {
      newExpandedMenus.delete(menuId);
    } else {
      newExpandedMenus.add(menuId);
    }
    setExpandedMenus(newExpandedMenus);
  };

  const getIconComponent = (icon, name) => {
    const iconMap = {
      '📊': BarChartOutlined,
      '💰': DollarOutlined,
      '🛒': ShoppingCartOutlined,
      '📦': InboxOutlined,
      '📋': UnorderedListOutlined,
      '👥': TeamOutlined,
      '⚙️': SettingOutlined,
      '❤️': HeartOutlined,
      '👨‍⚕️': StethoscopeOutlined,
      '📅': CalendarOutlined,
      '💊': MedicineBoxOutlined,
      '🏥': HospitalOutlined,
      '🔐': SafetyOutlined,
      '👤': UserOutlined,
      '🏢': BankOutlined,
      '📄': FileTextOutlined,
      '🔍': SearchOutlined,
      '📈': ActivityOutlined
    };

    // Si es un emoji, usar el mapeo
    if (icon && iconMap[icon]) {
      const IconComponent = iconMap[icon];
      return <IconComponent style={{ fontSize: '16px' }} />;
    }

    // Si es un nombre específico, mapear por nombre
    const nameMap = {
      'Health': HeartOutlined,
      'Sales': DollarOutlined,
      'Purchase': ShoppingCartOutlined,
      'Inventory': InboxOutlined,
      'Accounting': FileTextOutlined,
      'HR': TeamOutlined,
      'Settings': SettingOutlined,
      'Dashboard': BarChartOutlined,
      'Patient': HeartOutlined,
      'Doctor': StethoscopeOutlined,
      'Appointment': CalendarOutlined,
      'Medicine': MedicineBoxOutlined,
      'Department': BankOutlined,
      'Report': BarChartOutlined
    };

    if (name && nameMap[name]) {
      const IconComponent = nameMap[name];
      return <IconComponent style={{ fontSize: '16px' }} />;
    }

    // Fallback por defecto
    return <FileTextOutlined style={{ fontSize: '16px' }} />;
  };

  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.childs && item.childs.length > 0;
    const isExpanded = expandedMenus.has(item.id);
    const isActive = activeTab === item.id;

    return (
      <div key={item.id} style={{ marginLeft: level > 0 ? '24px' : '0' }}>
        <Button
          type={isActive ? 'primary' : 'text'}
          onClick={() => {
            if (hasChildren) {
              toggleMenuExpansion(item.id);
            } else {
              setActiveTab(item.id);
            }
          }}
          style={{
            width: '100%',
            height: 'auto',
            padding: '12px 16px',
            marginBottom: '4px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: isActive ? '#1890ff' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: isActive ? 'white' : '#666'
          }}
          title={item.description || item.name || item.label}
        >
          <Space>
            {hasChildren && (
              <span style={{ fontSize: '12px' }}>
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
              </span>
            )}
            {getIconComponent(item.icon, item.name)}
            {sidebarOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: isActive ? 'white' : '#333'
                }}>
                  {item.name || item.label}
                </Text>
                {item.type === 'module' && item.model && (
                  <Text style={{ 
                    fontSize: '12px', 
                    opacity: 0.7,
                    color: isActive ? 'white' : '#666'
                  }}>
                    {item.model}
                  </Text>
                )}
              </div>
            )}
          </Space>
        </Button>
        
        {hasChildren && isExpanded && sidebarOpen && (
          <div style={{ marginTop: '4px' }}>
            {item.childs.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100%' }}>
            <div style={{ marginBottom: '32px' }}>
              <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
                Hospital Management
              </Title>
              <Paragraph style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
                Panel de control del sistema Tryton Health
              </Paragraph>
            </div>
            
            {/* Quick Access Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
              <Col xs={12} sm={8} md={4}>
                <Card 
                  hoverable
                  style={{ textAlign: 'center', borderRadius: '12px' }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#fef2f2',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <HeartOutlined style={{ fontSize: '24px', color: '#ef4444' }} />
                  </div>
                  <Text strong>Pacientes</Text>
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card 
                  hoverable
                  style={{ textAlign: 'center', borderRadius: '12px' }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#eff6ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <StethoscopeOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />
                  </div>
                  <Text strong>Doctores</Text>
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card 
                  hoverable
                  style={{ textAlign: 'center', borderRadius: '12px' }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <CalendarOutlined style={{ fontSize: '24px', color: '#10b981' }} />
                  </div>
                  <Text strong>Citas</Text>
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card 
                  hoverable
                  style={{ textAlign: 'center', borderRadius: '12px' }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#faf5ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <MedicineBoxOutlined style={{ fontSize: '24px', color: '#8b5cf6' }} />
                  </div>
                  <Text strong>Medicamentos</Text>
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card 
                  hoverable
                  style={{ textAlign: 'center', borderRadius: '12px' }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#fffbeb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <HospitalOutlined style={{ fontSize: '24px', color: '#f59e0b' }} />
                  </div>
                  <Text strong>Departamentos</Text>
                </Card>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Card 
                  hoverable
                  style={{ textAlign: 'center', borderRadius: '12px' }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: '#eef2ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <BarChartOutlined style={{ fontSize: '24px', color: '#6366f1' }} />
                  </div>
                  <Text strong>Reportes</Text>
                </Card>
              </Col>
            </Row>

            <Row gutter={[24, 24]}>
              {/* Estadísticas principales */}
              <Col xs={24} lg={16}>
                <Card 
                  title="Estadísticas del Sistema"
                  style={{ borderRadius: '12px' }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="Módulos"
                        value={menuItems.filter(item => item.type === 'module').length}
                        prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="Modelos"
                        value={menuItems.find(item => item.id === 'dashboard')?.modelAccessCount || 0}
                        prefix={<SafetyOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="Usuario"
                        value={sessionData.username}
                        prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="Base de Datos"
                        value={sessionData.database}
                        prefix={<DatabaseOutlined style={{ color: '#fa8c16' }} />}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* Información de sesión */}
              <Col xs={24} lg={8}>
                <Card 
                  title="Información de Sesión"
                  style={{ borderRadius: '12px' }}
                  bodyStyle={{ padding: '24px' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Usuario</Text>
                      <Text strong>{sessionData.username}</Text>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Base de Datos</Text>
                      <Text strong>{sessionData.database}</Text>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">ID Usuario</Text>
                      <Text strong>{sessionData.userId}</Text>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Estado</Text>
                      <Tag color="green">Activo</Tag>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        );
      default:
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
        
        // Si el menú seleccionado es "Health" (ID 69), mostrar la tabla de pacientes
        if (selectedItem && (selectedItem.name === 'Health' || selectedItem.id === 69)) {
          return <PatientsTable sessionData={sessionData} />;
        }
        
        return (
          <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100%' }}>
            <div style={{ marginBottom: '32px' }}>
              <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
                {selectedItem?.name || selectedItem?.label || 'Módulo'}
              </Title>
              <Paragraph style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
                Gestión de {selectedItem?.name || selectedItem?.label}
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
                      background: '#eff6ff',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px'
                    }}>
                      {getIconComponent(selectedItem?.icon, selectedItem?.name)}
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>
                        {selectedItem?.name || selectedItem?.label}
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
                      <Button type="primary" block icon={<SettingOutlined />}>
                        Configurar
                      </Button>
                      <Button block icon={<FileTextOutlined />}>
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
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ 
              color: 'white', 
              marginRight: '16px',
              fontSize: '18px'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px'
            }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>T</Text>
            </div>
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              Tryton Health Management
            </Title>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Search
            placeholder="Buscar..."
            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.6)' }} />}
            style={{
              width: 300,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white'
            }}
          />
          <Space>
            <div style={{ textAlign: 'right' }}>
              <Text style={{ color: 'white', display: 'block', fontSize: '14px' }}>
                {sessionData.username}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                {sessionData.database}
              </Text>
            </div>
            <Avatar 
              style={{ 
                background: 'rgba(255,255,255,0.2)',
                color: 'white'
              }}
            >
              {sessionData.username.charAt(0).toUpperCase()}
            </Avatar>
            <Tooltip title="Cerrar sesión">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ color: 'white' }}
              />
            </Tooltip>
          </Space>
        </div>
      </Header>

      <Layout>
        {/* Sidebar */}
        <Sider
          trigger={null}
          collapsible
          collapsed={!sidebarOpen}
          width={256}
          collapsedWidth={64}
          style={{
            background: '#001529',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '32px 0' 
              }}>
                <Spin size="large" />
                {sidebarOpen && (
                  <Text style={{ color: '#fff', marginLeft: '12px' }}>
                    Cargando menú...
                  </Text>
                )}
              </div>
            ) : error ? (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" onClick={loadSidebarMenu}>
                    Reintentar
                  </Button>
                }
              />
            ) : null}
            
            <div style={{ marginTop: '16px' }}>
              {menuItems.map((item) => renderMenuItem(item))}
            </div>
            
            {sidebarOpen && (
              <div style={{ 
                marginTop: '32px', 
                paddingTop: '16px', 
                borderTop: '1px solid #303030' 
              }}>
                <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                  {(() => {
                    const countTotalItems = (items) => {
                      let count = items.length;
                      items.forEach(item => {
                        if (item.childs && item.childs.length > 0) {
                          count += countTotalItems(item.childs);
                        }
                      });
                      return count;
                    };
                    return `${countTotalItems(menuItems)} elementos cargados`;
                  })()}
                </Text>
              </div>
            )}
          </div>
        </Sider>

        {/* Main Content */}
        <Content style={{ overflow: 'auto' }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;

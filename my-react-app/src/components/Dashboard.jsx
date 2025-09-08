import { useState, useEffect } from 'react';
import trytonService from '../services/trytonService';
import PatientsTable from './PatientsTable';

const Dashboard = ({ sessionData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      
      // Convertir los módulos a elementos del menú
      const sidebarItems = [
        { 
          id: 'dashboard', 
          label: 'Dashboard', 
          icon: '📊', 
          type: 'dashboard',
          modelAccessCount: result.modelAccess?.length || 0
        },
        ...result.menuItems.map(item => ({
          id: item.id,
          label: item.name,
          icon: item.icon,
          type: 'module',
          model: item.model,
          description: item.description
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


  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
            
            {/* Información de la sesión */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de Sesión</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Usuario</p>
                  <p className="font-medium">{sessionData.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Base de Datos</p>
                  <p className="font-medium">{sessionData.database}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID de Usuario</p>
                  <p className="font-medium">{sessionData.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID de Sesión</p>
                  <p className="font-medium">{sessionData.sessionId}</p>
                </div>
              </div>
            </div>
            
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Módulos</p>
                    <p className="text-2xl font-bold text-gray-800">{menuItems.filter(item => item.type === 'module').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Modelos Accesibles</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {menuItems.find(item => item.id === 'dashboard')?.modelAccessCount || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Usuario</p>
                    <p className="text-2xl font-bold text-gray-800">{sessionData.username}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Base de Datos</p>
                    <p className="text-2xl font-bold text-gray-800">{sessionData.database}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="text-2xl font-bold text-gray-800">Activo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        const selectedItem = menuItems.find(item => item.id === activeTab);
        
        // Si el menú seleccionado es "Health" (ID 69), mostrar la tabla de pacientes
        if (selectedItem && (selectedItem.name === 'Health' || selectedItem.id === 69)) {
          return <PatientsTable sessionData={sessionData} />;
        }
        
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {selectedItem?.name || selectedItem?.label || 'Módulo'}
            </h2>
            <div className="bg-white rounded-lg shadow p-6">
              {selectedItem?.type === 'module' ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    <strong>Modelo:</strong> {selectedItem.model}
                  </p>
                  {selectedItem.description && (
                    <p className="text-gray-600 mb-4">
                      <strong>Descripción:</strong> {selectedItem.description}
                    </p>
                  )}
                  <p className="text-gray-600">
                    Módulo {selectedItem.name || selectedItem.label} en desarrollo...
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">
                  Módulo {selectedItem?.name || selectedItem?.label} en desarrollo...
                </p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="ml-4 flex items-center">
                <span className="text-xl font-semibold">Tryton</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="text-gray-300">Usuario: {sessionData.username}</p>
                <p className="text-gray-400">DB: {sessionData.database}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md hover:bg-gray-700 transition-colors"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 h-full overflow-y-auto`}>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando menú...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={loadSidebarMenu}
                  className="text-sm text-red-800 underline mt-1"
                >
                  Reintentar
                </button>
              </div>
            ) : null}
            
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={item.description || item.name || item.label}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  {sidebarOpen && (
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{item.name || item.label}</span>
                      {item.type === 'module' && (
                        <span className="text-xs text-gray-500">{item.model}</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </nav>
            
            {sidebarOpen && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {menuItems.length} elementos cargados
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;

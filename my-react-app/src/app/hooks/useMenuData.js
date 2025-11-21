import { useState, useEffect } from 'react';
import trytonService from '../../services/trytonService';

/**
 * Hook para manejar los datos del menú del sidebar
 */
export const useMenuData = (sessionData) => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Cargar menú al montar
  useEffect(() => {
    loadMenu();
  }, []);

  // Manejar responsive del sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check inicial

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError('');

      const sessionRestored = trytonService.restoreSession(sessionData);
      if (!sessionRestored) {
        throw new Error('No se pudo restaurar la sesión');
      }

      // Validar sesión
      const isValid = await trytonService.validateSession();
      if (!isValid) {
        console.warn('⚠️ Sesión no válida, pero continuando...');
      }

      // Obtener menú
      const result = await trytonService.getSidebarMenu();
      console.log('✅ Menú obtenido:', result);

      // Construir items del sidebar con Dashboard como primer item
      const sidebarItems = [
        {
          id: 'dashboard',
          name: 'Dashboard',
          icon: '📊',
          iconName: null,
          iconUrl: null,
          type: 'dashboard',
          model: '',
          description: 'Dashboard principal',
          childs: [],
          hasChildren: false,
          childrenLoaded: true
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
          childs: item.childs || null,
          childIds: item.childIds || [],
          hasChildren: item.hasChildren || false,
          childrenLoaded: item.childrenLoaded || false
        }))
      ];

      setMenuItems(sidebarItems);
    } catch (err) {
      console.error('❌ Error cargando menú:', err);
      setError(err.message);

      // Fallback: menú mínimo
      setMenuItems([
        {
          id: 'dashboard',
          name: 'Dashboard',
          icon: '📊',
          type: 'dashboard',
          childs: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const loadMenuChildren = async (menuId) => {
    try {

      const children = await trytonService.loadMenuChildren(menuId);

      setMenuItems(prevItems => {
        const updateMenuItem = (items) => {
          return items.map(item => {
            if (item.id === menuId) {
              return {
                ...item,
                childs: children,
                childrenLoaded: true
              };
            } else if (item.childs && Array.isArray(item.childs) && item.childs.length > 0) {
              return {
                ...item,
                childs: updateMenuItem(item.childs)
              };
            }
            return item;
          });
        };

        return updateMenuItem(prevItems);
      });

      console.log(`✅ Children loaded for menu ${menuId}`);
      return children;
    } catch (error) {
      console.error(`❌ Error loading children for menu ${menuId}:`, error);
      throw error;
    }
  };

  return {
    items: menuItems,
    loading,
    error,
    sidebarOpen,
    toggleSidebar,
    reload: loadMenu,
    loadMenuChildren
  };
};

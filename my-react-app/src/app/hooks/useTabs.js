import { useState, useCallback } from 'react';

/**
 * Hook para manejar el sistema de tabs
 */
export const useTabs = () => {
  const [tabs, setTabs] = useState([
    {
      id: 'dashboard',
      title: 'Dashboard',
      type: 'dashboard',
      closable: false,
      active: true,
      data: null
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('dashboard');

  // Crear nueva tab
  const createTab = useCallback((tabData) => {
    const { id, title, type, data, closable = true } = tabData;
    
    // Verificar si la tab ya existe
    const existingTab = tabs.find(tab => tab.id === id);
    if (existingTab) {
      // Si ya existe, solo activarla
      setActiveTabId(id);
      return id;
    }

    // Crear nueva tab
    const newTab = {
      id,
      title,
      type,
      closable,
      active: true,
      data,
      timestamp: new Date().toISOString()
    };

    setTabs(prevTabs => {
      // Desactivar todas las tabs existentes
      const updatedTabs = prevTabs.map(tab => ({ ...tab, active: false }));
      return [...updatedTabs, newTab];
    });

    setActiveTabId(id);
    return id;
  }, [tabs]);

  // Cerrar tab
  const closeTab = useCallback((tabId) => {
    if (tabId === 'dashboard') return; // No se puede cerrar el dashboard

    setTabs(prevTabs => {
      const filteredTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // Si se cerró la tab activa, activar otra
      if (activeTabId === tabId && filteredTabs.length > 0) {
        const lastTab = filteredTabs[filteredTabs.length - 1];
        setActiveTabId(lastTab.id);
        return filteredTabs.map(tab => ({
          ...tab,
          active: tab.id === lastTab.id
        }));
      }
      
      return filteredTabs;
    });
  }, [activeTabId]);

  // Activar tab
  const activateTab = useCallback((tabId) => {
    setActiveTabId(tabId);
    setTabs(prevTabs => 
      prevTabs.map(tab => ({
        ...tab,
        active: tab.id === tabId
      }))
    );
  }, []);

  // Cerrar todas las tabs excepto el dashboard
  const closeAllTabs = useCallback(() => {
    setTabs(prevTabs => prevTabs.filter(tab => tab.id === 'dashboard'));
    setActiveTabId('dashboard');
  }, []);

  // Obtener tab activa
  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.id === activeTabId);
  }, [tabs, activeTabId]);

  // Actualizar datos de una tab
  const updateTabData = useCallback((tabId, newData) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, data: { ...tab.data, ...newData } }
          : tab
      )
    );
  }, []);

  // Actualizar título de una tab
  const updateTabTitle = useCallback((tabId, newTitle) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, title: newTitle }
          : tab
      )
    );
  }, []);

  return {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    activateTab,
    closeAllTabs,
    getActiveTab,
    updateTabData,
    updateTabTitle
  };
};

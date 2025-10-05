import trytonConfig from '../../env.config.js';

// Servicio para conectar con la API de Tryton
class TrytonService {
  constructor() {
    this.baseURL = trytonConfig.baseURL;
    this.sessionData = null;
    this.database = null;
    this.context = {};
    this.rpcId = 0;
  }

  // Función utoa
  utoa(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  // Generar header de autorización
  getAuthHeader() {
    if (!this.sessionData) return '';
    
    const { username, userId, sessionId } = this.sessionData;
    // Formato: username + ':' + userId + ':' + sessionId
    // Donde: login = username, user_id = userId, session = sessionId
    const authString = `${username}:${userId}:${sessionId}`;
    const encoded = this.utoa(authString);
    return encoded;
  }


  // Construir URL para Tryton
  buildURL(method) {
    // common.db.list NO usa base de datos - es para listar las bases disponibles
    if (method === 'common.db.list') {
      return `${this.baseURL}/`;
    }
    
    // Formato: '/' + (database || '') + '/'
    // Si hay base de datos, usar la estructura /database/
    if (this.database && this.database.trim() !== '') {
      return `${this.baseURL}/${this.database}/`;
    }
    
    // Fallback a URL base (sin base de datos)
    return `${this.baseURL}/`;
  }

  // Método RPC principal simplificado
  async makeRpcCall(method, params = []) {
    const url = this.buildURL(method);
    
    
    // Construir parámetros
    // Agregar contexto a los parámetros
    const rpcParams = [...params];
    
    // Agregar contexto si hay sesión
    if (this.sessionData && Object.keys(this.context).length > 0) {
      const lastParam = rpcParams.pop() || {};
      rpcParams.push({ ...this.context, ...lastParam });
    }

    // Payload
    const payload = {
      id: ++this.rpcId,
      method: method,
      params: rpcParams
    };

    // Headers
    const headers = {
      'Authorization': this.sessionData ? `Session ${this.getAuthHeader()}` : '',
      'Content-Type': 'application/json'
    };


    try {
      
      // Llamada fetch
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'omit'
      });


      if (response.status === 401) {
        // Manejar error 401
        this.clearSession();
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }

      if (response.status === 403) {
        throw new Error('Acceso prohibido (403). Verifica la configuración de CORS en Tryton.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error HTTP:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          url: url
        });
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      return this.processResponse(data);
    } catch (error) {
      console.error('Error en llamada RPC:', {
        url,
        method,
        error: error.message,
        errorType: error.constructor.name,
        fullError: error
      });
      
      // Manejar errores de red específicamente
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Error de red: No se pudo conectar a ${url}. Verifica que el servidor Tryton esté ejecutándose y que la URL sea correcta.`);
      }
      
      throw error;
    }
  }

  // Procesar respuesta de manera consistente
  processResponse(data) {

    // Manejar respuestas directas de Tryton (como ["health50"])
    if (Array.isArray(data)) {
      return data;
    }

    // Manejar respuestas JSON-RPC estándar
    if (data && typeof data === 'object') {
      // Manejar errores JSON-RPC
      if (data.error) {
        const [errorType, errorMessage] = data.error;
        console.error('Error RPC:', errorType, errorMessage);
        throw new Error(`${errorType}: ${errorMessage}`);
      }

      // Retornar resultado
      return data.result;
    }

    // Fallback para otros tipos de respuesta
    return data;
  }

  // Login
  async login(database, username, password) {
    try {
      
      // Guardar base de datos
      this.database = database;
      
      // Primero obtener lista de bases de datos (sin base de datos específica)
      const databases = await this.makeRpcCall('common.db.list');
      
      // Verificar si la base de datos existe
      if (!databases.includes(database)) {
        throw new Error(`La base de datos '${database}' no existe. Bases disponibles: ${databases.join(', ')}`);
      }
      
      // Ahora hacer login en la base de datos específica
      
      const loginParams = [
        username,
        { password: password },
        'en' // Idioma
      ];
      
      const result = await this.makeRpcCall('common.db.login', loginParams);

      if (result && result.length >= 2) {
        // Crear sesión
        // result[0] = user_id, result[1] = session
        this.sessionData = {
          userId: result[0],      // user_id viene primero
          sessionId: result[1],   // session viene segundo
          database: database,
          username: username,
          loginTime: new Date().toISOString()
        };

        // Cargar contexto del usuario
        await this.loadUserContext();
        
        return this.sessionData;
      } else {
        throw new Error('Credenciales inválidas');
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  // Cargar contexto del usuario
  async loadUserContext() {
    try {
      const context = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      this.context = context || {};
    } catch (error) {
      console.warn('No se pudo cargar el contexto del usuario:', error.message);
      this.context = {};
    }
  }

  // Logout
  async logout() {
    if (!this.sessionData) {
      return { success: true };
    }

    try {
      
      await this.makeRpcCall('common.db.logout');
      
      this.clearSession();
      return { success: true };
    } catch (error) {
      console.error('Error en logout:', error);
      // Forzar logout local incluso si falla
      this.clearSession();
      return { success: true };
    }
  }

  // Limpiar sesión
  clearSession() {
    this.sessionData = null;
    this.database = null;
    this.context = {};
    
    // Limpiar localStorage
    try {
      localStorage.removeItem('tryton_session');
    } catch (error) {
      console.error('Error limpiando localStorage:', error);
    }
  }

  // Restaurar sesión desde datos externos
  restoreSession(sessionData) {
    
    if (sessionData && typeof sessionData === 'object') {
      if (!sessionData.sessionId || !sessionData.userId || !sessionData.username || !sessionData.database) {
        console.error('Datos de sesión incompletos:', sessionData);
        this.clearSession();
        return false;
      }
      
      this.sessionData = sessionData;
      this.database = sessionData.database;
      
      
      // NO cargar contexto automáticamente aquí - se hará en getSidebarMenu
      
      return true;
    } else {
      this.clearSession();
      return false;
    }
  }

  // Verificar conexión
  async checkConnection() {
    try {
      
      // Probar common.db.list (sin base de datos)
      const databases = await this.makeRpcCall('common.db.list');
      
      return {
        connected: true,
        databases: databases,
        serverUrl: this.baseURL,
        message: `Conexión exitosa. ${databases.length} bases de datos encontradas.`
      };
    } catch (error) {
      console.error('Error verificando conexión:', error);
      
      return {
        connected: false,
        error: error.message,
        serverUrl: this.baseURL,
        suggestions: [
          'Verifica que el servidor Tryton esté ejecutándose',
          'Comprueba que el puerto esté disponible',
          'Verifica la configuración de CORS en Tryton',
          'Revisa la configuración de endpoints en Tryton'
        ]
      };
    }
  }

  // Obtener preferencias del usuario
  async getUserPreferences() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      
      // Usar true como primer parámetro (contexto completo)
      const preferences = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      return preferences;
    } catch (error) {
      console.error('Error obteniendo preferencias:', error);
      throw error;
    }
  }

  // Función auxiliar para obtener submenús (recursiva)
  async getSubmenus(childIds, level = 0, maxDepth = 5) {
    if (!childIds || childIds.length === 0 || level >= maxDepth) {
      if (level >= maxDepth) {
        console.warn(`⚠️ Máxima profundidad alcanzada (${maxDepth}) para IDs:`, childIds);
      }
      return [];
    }
    
    try {
      console.log(`📁 Obteniendo submenús nivel ${level} para IDs:`, childIds);
      
      const submenuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
        childIds,
        ['active', 'childs', 'favorite', 'icon', 'name', 'parent', 'icon:string', 'parent.rec_name', 'rec_name', '_timestamp', '_write', '_delete'],
        {}
      ]);
      
      if (submenuDetails && submenuDetails.length > 0) {
        console.log(`✅ Obtenidos ${submenuDetails.length} submenús en nivel ${level}`);
        
        // Procesar cada submenú y obtener sus hijos recursivamente
        const processedSubmenus = await Promise.all(submenuDetails.map(async (submenu) => {
          console.log(`🔍 Procesando submenú: ${submenu.name} (ID: ${submenu.id})`);
          
          // Si tiene hijos, obtenerlos recursivamente
          let childSubmenus = [];
          if (submenu.childs && submenu.childs.length > 0) {
            console.log(`📂 Submenú ${submenu.name} tiene ${submenu.childs.length} hijos:`, submenu.childs);
            childSubmenus = await this.getSubmenus(submenu.childs, level + 1, maxDepth);
          }
          
          return {
            id: submenu.id,
            name: submenu.name || submenu.rec_name || `Submenú ${submenu.id}`,
            icon: submenu.icon || '📋',
            iconName: submenu['icon:string'] || submenu.icon || 'tryton-list',
            model: submenu.model || '',
            description: submenu.description || submenu.name || submenu.rec_name || `Submenú ${submenu.id}`,
            sequence: submenu.sequence || 0,
            childs: childSubmenus,
            parent: submenu.parent || null,
            parentName: submenu['parent.']?.rec_name || null
          };
        }));
        
        console.log(`✅ Completado nivel ${level} con ${processedSubmenus.length} submenús`);
        return processedSubmenus;
      }
      return [];
    } catch (error) {
      console.warn(`❌ Error obteniendo submenús nivel ${level}:`, error.message);
      return [];
    }
  }

  // Obtener menú del sidebar
  async getSidebarMenu() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      
      // PRIMERO: Probar una llamada simple para verificar la autenticación
      try {
        const testResult = await this.makeRpcCall('model.ir.module.search_read', [
          [['state', '=', 'installed']],
          ['name']
        ]);
      } catch (authError) {
        console.error('Error de autenticación:', authError);
        throw new Error('Error de autenticación: ' + authError.message);
      }
      
      // SECUENCIA CORRECTA:
      // 1. Recargar contexto
      await this.loadUserContext();
      
      // 2. Obtener preferencias del usuario
      const preferences = await this.getUserPreferences();
      
      
      // 3. Cargar acceso a modelos
      const modelAccess = await this.getModelAccess();
      
      // 4. Cargar iconos disponibles
      const icons = await this.makeRpcCall('model.ir.ui.icon.list_icons', [{}]);
      
      // Crear mapa de iconos para mapear IDs con nombres
      const iconMap = {};
      if (Array.isArray(icons)) {
        icons.forEach(icon => {
          if (Array.isArray(icon) && icon.length >= 2) {
            iconMap[icon[0]] = icon[1]; // icon[0] = ID, icon[1] = nombre
          }
        });
      }
      
      // 5. Obtener menús
      let menuItems = [];
      
      if (preferences.pyson_menu) {
        
        // Usar el pyson_menu para obtener la acción del menú principal
        // Por ahora, vamos a obtener los menús directamente usando ir.ui.menu
        // pero con la sintaxis correcta que funciona
        
        try {
          // PRIMER PASO: Obtener IDs de menús
          const menuIds = await this.makeRpcCall('model.ir.ui.menu.search_read', [
            [['parent', '=', null]],
            ['id']
          ]);
          
          
          if (menuIds && menuIds.length > 0) {
            // SEGUNDO PASO: Obtener detalles completos con read
            const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
              menuIds.map(m => m.id), // Array de IDs
              [
                'active',
                'childs',
                'favorite',
                'icon',
                'name',
                'parent',
                'icon:string',
                'parent.rec_name',
                'rec_name',
                '_timestamp',
                '_write',
                '_delete'
              ],
              {} // Contexto
            ]);
            
            
            if (menuDetails && menuDetails.length > 0) {
              menuItems = await Promise.all(menuDetails.map(async (menu) => {
                const finalName = menu.name || menu.rec_name || `Menú ${menu.id}`;
                
                // Obtener submenús si existen
                const submenus = await this.getSubmenus(menu.childs);
                
                return {
                  id: menu.id,
                  name: finalName,
                  icon: menu.icon || '📋',
                  iconName: menu['icon:string'] || menu.icon || 'tryton-list',
                  model: menu.model || '',
                  description: menu.description || menu.name || menu.rec_name || `Menú ${menu.id}`,
                  sequence: menu.sequence || 0,
                  childs: submenus
                };
              }));
            }
          }
        } catch (menuError) {
          console.warn('Error obteniendo menús con search_read, intentando método alternativo:', menuError.message);
          
          // Método alternativo: obtener solo IDs y luego usar read individual
          try {
            const menuIds = await this.makeRpcCall('model.ir.ui.menu.search_read', [
              [['parent', '=', null]],
              ['id']
            ]);
            
            
            // Usar read individual para cada menú
            for (const menuIdObj of menuIds) {
              try {
                const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
                  [menuIdObj.id],
                  ['name', 'icon', 'sequence', 'childs', 'model', 'description']
                ]);
                
                if (menuDetails && menuDetails.length > 0) {
                  const menu = menuDetails[0];
                  // Usar el ID del menú para buscar en el mapa de iconos
                  const iconName = iconMap[menu.id] || 'tryton-list';
                  
                  // Obtener submenús si existen
                  const submenus = await this.getSubmenus(menu.childs);
                  
                  menuItems.push({
                    id: menu.id,
                    name: menu.name || iconName || `Menú ${menu.id}`,
                    icon: menu.id || '📋', // Usar el ID del menú como icono
                    iconName: iconName,
                    model: menu.model || '',
                    description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                    sequence: menu.sequence || 0,
                    childs: submenus
                  });
                }
              } catch (individualError) {
                console.warn(`Error obteniendo detalles del menú ${menuIdObj.id}:`, individualError.message);
                // Agregar menú básico como fallback
                const fallbackIconName = iconMap[menuIdObj.id] || 'tryton-list';
                menuItems.push({
                  id: menuIdObj.id,
                  name: fallbackIconName || `Menú ${menuIdObj.id}`,
                  icon: menuIdObj.id || '📋',
                  iconName: fallbackIconName,
                  model: '',
                  description: fallbackIconName || `Menú ${menuIdObj.id}`,
                  sequence: 0,
                  childs: []
                });
              }
            }
          } catch (fallbackError) {
            console.error('Error en método alternativo:', fallbackError.message);
            // Crear menús básicos como último recurso
            menuItems = [
              { id: 1, name: 'Dashboard', icon: '📊', model: '', description: 'Dashboard principal', sequence: 0, childs: [] },
              { id: 2, name: 'Ventas', icon: '💰', model: '', description: 'Módulo de ventas', sequence: 1, childs: [] },
              { id: 3, name: 'Compras', icon: '🛒', model: '', description: 'Módulo de compras', sequence: 2, childs: [] }
            ];
          }
        }
      } else {
        
        // Intentar cargar menús reales cuando no hay pyson_menu
        try {
          // PRIMER INTENTO: Usar search_read para obtener IDs
          const menuIds = await this.makeRpcCall('model.ir.ui.menu.search_read', [
            [['parent', '=', null]],
            ['id']
          ]);
          
          
          if (menuIds && menuIds.length > 0) {
            // SEGUNDO INTENTO: Usar read con todos los campos
            const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
              menuIds.map(m => m.id), // Array de IDs
              [
                'active',
                'childs',
                'favorite',
                'icon',
                'name',
                'parent',
                'icon:string',
                'parent.rec_name',
                'rec_name',
                '_timestamp',
                '_write',
                '_delete'
              ],
              {} // Contexto
            ]);
            
            
            if (menuDetails && menuDetails.length > 0) {
              menuItems = await Promise.all(menuDetails.map(async (menu) => {
                const finalName = menu.name || menu.rec_name || `Menú ${menu.id}`;
                
                // Obtener submenús si existen
                const submenus = await this.getSubmenus(menu.childs);
                
                return {
                  id: menu.id,
                  name: finalName,
                  icon: menu.icon || '📋',
                  iconName: menu['icon:string'] || menu.icon || 'tryton-list',
                  model: menu.model || '',
                  description: menu.description || menu.name || menu.rec_name || `Menú ${menu.id}`,
                  sequence: menu.sequence || 0,
                  childs: submenus
                };
              }));
            } else {
              throw new Error('No se obtuvieron detalles de menús');
            }
          } else {
            throw new Error('No se encontraron menús');
          }
        } catch (directMenuError) {
          console.warn('Error cargando menús directamente:', directMenuError.message);
          
          // SEGUNDO INTENTO: Usar los IDs que ya tenemos del array que mostraste
          const knownMenuIds = [59, 51, 132, 49, 118, 350, 69, 354, 260, 1];
          
          try {
            // Usar read con múltiples IDs de una vez
            const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
              knownMenuIds,
              [
                'active',
                'childs',
                'favorite',
                'icon',
                'name',
                'parent',
                'icon:string',
                'parent.rec_name',
                'rec_name',
                '_timestamp',
                '_write',
                '_delete'
              ],
              {} // Contexto
            ]);
            
            
            if (menuDetails && menuDetails.length > 0) {
              menuItems = await Promise.all(menuDetails.map(async (menu) => {
                const finalName = menu.name || menu.rec_name || `Menú ${menu.id}`;
                
                // Obtener submenús si existen
                const submenus = await this.getSubmenus(menu.childs);
                
                return {
                  id: menu.id,
                  name: finalName,
                  icon: menu.icon || '📋',
                  iconName: menu['icon:string'] || menu.icon || 'tryton-list',
                  model: menu.model || '',
                  description: menu.description || menu.name || menu.rec_name || `Menú ${menu.id}`,
                  sequence: menu.sequence || 0,
                  childs: submenus
                };
              }));
            } else {
              throw new Error('No se obtuvieron detalles de menús');
            }
          } catch (readMultipleError) {
            console.warn('Error con read múltiple:', readMultipleError.message);
            
            // TERCER INTENTO: Obtener solo IDs y luego usar read individual
            try {
              const menuIds = await this.makeRpcCall('model.ir.ui.menu.search_read', [
                [['parent', '=', null]],
                ['id']
              ]);
              
              
              // Usar read individual para cada menú
              for (const menuIdObj of menuIds) {
                try {
                  const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
                    [menuIdObj.id],
                    ['name', 'icon', 'sequence', 'childs', 'model', 'description']
                  ]);
                  
                  if (menuDetails && menuDetails.length > 0) {
                    const menu = menuDetails[0];
                    // Usar el ID del menú para buscar en el mapa de iconos
                    const iconName = iconMap[menu.id] || 'tryton-list';
                    
                    // Obtener submenús si existen
                    const submenus = await this.getSubmenus(menu.childs);
                    
                    menuItems.push({
                      id: menu.id,
                      name: menu.name || iconName || `Menú ${menu.id}`,
                      icon: menu.id || '📋', // Usar el ID del menú como icono
                      iconName: iconName,
                      model: menu.model || '',
                      description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                      sequence: menu.sequence || 0,
                      childs: submenus
                    });
                  }
                } catch (individualError) {
                  console.warn(`Error obteniendo detalles del menú ${menuIdObj.id}:`, individualError.message);
                  // Agregar menú básico como fallback
                  const fallbackIconName = iconMap[menuIdObj.id] || 'tryton-list';
                  menuItems.push({
                    id: menuIdObj.id,
                    name: fallbackIconName || `Menú ${menuIdObj.id}`,
                    icon: menuIdObj.id || '📋',
                    iconName: fallbackIconName,
                    model: '',
                    description: fallbackIconName || `Menú ${menuIdObj.id}`,
                    sequence: 0,
                    childs: []
                  });
                }
              }
            } catch (fallbackError) {
              console.error('Error en método alternativo:', fallbackError.message);
              // Fallback a menús básicos como último recurso
              menuItems = [
                { id: 1, name: 'Dashboard', icon: '📊', model: '', description: 'Dashboard principal', sequence: 0, childs: [] },
                { id: 2, name: 'Ventas', icon: '💰', model: '', description: 'Módulo de ventas', sequence: 1, childs: [] },
                { id: 3, name: 'Compras', icon: '🛒', model: '', description: 'Módulo de compras', sequence: 2, childs: [] }
              ];
            }
          }
        }
      }
      
      // Ordenar por sequence
      menuItems.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      
      
      return {
        preferences,
        menuItems,
        icons,
        modelAccess,
        viewSearch: [], // Placeholder para vistas de búsqueda
        pysonMenu: preferences.pyson_menu
      };
    } catch (error) {
      console.error('Error obteniendo menú del sidebar:', error);
      throw error;
    }
  }


  // Método específico para obtener bases de datos disponibles
  async getAvailableDatabases() {
    try {
      const databases = await this.makeRpcCall('common.db.list');
      
      if (databases && Array.isArray(databases) && databases.length > 0) {
        return databases;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error obteniendo bases de datos:', error.message);
      throw error;
    }
  }

  // Validar sesión activa
  async validateSession() {
    if (!this.sessionData) {
      return false;
    }

    try {
      
      // Intentar una llamada simple para verificar que la sesión sigue siendo válida
      const result = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      
      if (result && typeof result === 'object') {
        // Actualizar el contexto con la respuesta
        this.context = result;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      
      // Si es un error de red o 401, la sesión definitivamente no es válida
      if (error.message.includes('401') || error.message.includes('expirado') || error.message.includes('NetworkError')) {
        return false;
      }
      
      // Para otros errores, asumir que la sesión podría ser válida
      return true;
    }
  }

  // Obtener acceso a modelos
  async getModelAccess() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      
      const result = await this.makeRpcCall('model.ir.model.access.search_read', [
        [],
        ['model', 'perm_read', 'perm_write', 'perm_create', 'perm_delete']
      ]);
      
      return result;
    } catch (error) {
      console.error('Error obteniendo acceso a modelos:', error);
      throw error;
    }
  }






  // Obtener información de acción de menú
  async getMenuActionInfo(menuId, selectedActionIndex = 0) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo información de acción para menú ID: ${menuId}`);
      
      // PASO 1: Obtener la información de la acción del menú
      const actionInfo = await this.makeRpcCall('model.ir.action.keyword.get_keyword', [
        'tree_open',
        ['ir.ui.menu', menuId],
        {}
      ]);
      
      console.log('Información de acción obtenida:', actionInfo);
      
      // PASO 2: Verificar si hay múltiples opciones
      if (actionInfo && actionInfo.length > 0) {
        // Si hay múltiples opciones, usar la seleccionada o la primera por defecto
        const selectedAction = actionInfo[selectedActionIndex] || actionInfo[0];
        
        if (selectedAction.context_model) {
          // CASO: Hay context_model - múltiples opciones disponibles
          console.log(`⚠️ Múltiples opciones disponibles (${actionInfo.length}). Usando índice ${selectedActionIndex}`);
          
          return {
            actionInfo: actionInfo,
            toolbarInfo: null,
            resModel: selectedAction.res_model,
            contextModel: selectedAction.context_model,
            actionName: selectedAction.name,
            hasMultipleOptions: true,
            options: actionInfo.map((option, index) => ({
              index: index,
              id: option.id,
              name: option.name,
              resModel: option.res_model,
              contextModel: option.context_model,
              views: option.views || []
            })),
            selectedOption: {
              index: selectedActionIndex,
              id: selectedAction.id,
              name: selectedAction.name,
              resModel: selectedAction.res_model,
              contextModel: selectedAction.context_model,
              views: selectedAction.views || []
            }
          };
        } else if (selectedAction.res_model) {
          // CASO: Acción directa sin context_model
          const resModel = selectedAction.res_model;
          const actionName = selectedAction.name || `Menú ${menuId}`;
          
          console.log(`Modelo encontrado: ${resModel}`);
          console.log(`Nombre de acción: ${actionName}`);
          
          // PASO 3: Hacer la llamada view_toolbar_get con el modelo obtenido
          console.log(`Ejecutando view_toolbar_get para modelo: ${resModel}`);
          const toolbarInfo = await this.makeRpcCall(`model.${resModel}.view_toolbar_get`, [{}]);
          
          console.log('Información de toolbar obtenida:', toolbarInfo);
          
          return {
            actionInfo: actionInfo,
            toolbarInfo: toolbarInfo,
            resModel: resModel,
            actionName: actionName,
            hasMultipleOptions: false,
            selectedOption: {
              index: 0,
              id: selectedAction.id,
              name: actionName,
              resModel: resModel,
              views: selectedAction.views || []
            }
          };
        }
      }
      
      console.warn('No se encontró res_model en la respuesta de acción:', actionInfo);
      return {
        actionInfo: actionInfo,
        toolbarInfo: null,
        resModel: null,
        actionName: null,
        hasMultipleOptions: false
      };
    } catch (error) {
      console.error('Error obteniendo información de acción del menú:', error);
      console.error('Detalles del error:', {
        menuId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  // Obtener vista de campos para un modelo
  async getFieldsView(model, viewId, viewType = 'tree') {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo vista de campos para modelo: ${model}, vista: ${viewId}, tipo: ${viewType}`);
      
      const fieldsView = await this.makeRpcCall(`model.${model}.fields_view_get`, [
        viewId,
        viewType,
        {}
      ]);
      
      console.log('Vista de campos obtenida:', fieldsView);
      
      return fieldsView;
    } catch (error) {
      console.error('Error obteniendo vista de campos:', error);
      throw error;
    }
  }

  // Obtener datos de un modelo
  async getModelData(model, domain = [], fields = [], limit = 100, offset = 0) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo datos para modelo: ${model}`);
      console.log('Parámetros:', { domain, fields, limit, offset });
      
      // PASO 1: Obtener IDs con search
      const ids = await this.makeRpcCall(`model.${model}.search`, [domain, offset, limit]);
      
      if (ids.length === 0) {
        console.log('📭 No se encontraron registros');
        return [];
      }
      
      console.log(`Encontrados ${ids.length} registros`);
      
      // PASO 2: Expandir campos para incluir relaciones
      const expandedFields = this.expandFieldsForRelations(fields, model);
      console.log(`Campos expandidos:`, expandedFields);
      
      // PASO 3: Obtener datos con read incluyendo campos relacionados
      const data = await this.makeRpcCall(`model.${model}.read`, [ids, expandedFields, {}]);
      
      console.log('Datos obtenidos:', data);
      
      return data;
    } catch (error) {
      console.error('Error obteniendo datos del modelo:', error);
      throw error;
    }
  }

  // Expandir campos para incluir relaciones automáticamente
  expandFieldsForRelations(fields, model) {
    const expandedFields = [...fields];
    
    // Campos comunes que suelen tener relaciones
    const relationFields = [
      'party', 'template', 'product', 'company', 'supplier',
      'account_category', 'default_uom', 'purchase_uom', 'lot_sequence',
      'default_uom_category', 'parent', 'category', 'uom', 'tax_group'
    ];
    
    // Agregar campos relacionados para cada campo de relación encontrado
    relationFields.forEach(fieldName => {
      if (fields.includes(fieldName) && !expandedFields.includes(`${fieldName}.rec_name`)) {
        expandedFields.push(`${fieldName}.rec_name`);
        console.log(`Agregando campo relacionado: ${fieldName}.rec_name`);
      }
    });
    
    // Agregar campos básicos que siempre queremos
    const basicFields = ['rec_name', '_timestamp', '_write', '_delete'];
    basicFields.forEach(fieldName => {
      if (!expandedFields.includes(fieldName)) {
        expandedFields.push(fieldName);
      }
    });
    
    return expandedFields;
  }

  // Obtener información completa de tabla (vista + datos)
  async getTableInfo(model, viewId, viewType = 'tree', domain = [], limit = 100, offset = 0) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo información completa de tabla para modelo: ${model}`);
      
      // PASO 1: Obtener vista de campos
      const fieldsView = await this.getFieldsView(model, viewId, viewType);
      
      // PASO 2: Extraer campos de la vista
      const fields = fieldsView.fields ? Object.keys(fieldsView.fields) : [];
      
      // PASO 3: Obtener datos
      const data = await this.getModelData(model, domain, fields, limit, offset);
      
      console.log('Información completa de tabla obtenida');
      
      return {
        fieldsView,
        data,
        model,
        viewId,
        viewType,
        fields
      };
    } catch (error) {
      console.error('Error obteniendo información completa de tabla:', error);
      throw error;
    }
  }

  // Obtener información completa de formulario (vista + datos de un registro)
  async getFormInfo(model, viewId, viewType = 'form', recordId = null) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo información completa de formulario para modelo: ${model}`);
      
      // PASO 1: Obtener vista de campos
      const fieldsView = await this.getFieldsView(model, viewId, viewType);
      
      // PASO 2: Extraer campos de la vista
      const fields = fieldsView.fields ? Object.keys(fieldsView.fields) : [];
      
      // PASO 3: Si hay recordId, obtener datos del registro
      let data = null;
      if (recordId) {
        data = await this.getModelData(model, [['id', '=', recordId]], fields, 1, 0);
        if (data && data.length > 0) {
          data = data[0];
        }
      }
      
      console.log('Información completa de formulario obtenida');
      
      return {
        fieldsView,
        data,
        model,
        viewId,
        viewType,
        fields,
        recordId
      };
    } catch (error) {
      console.error('Error obteniendo información completa de formulario:', error);
      throw error;
    }
  }

  // Obtener datos de un registro específico para formularios
  async getFormRecordData(model, recordId = 1, fields = []) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo datos del registro ${recordId} para modelo: ${model}`);
      
      // Obtener datos del registro específico
      const data = await this.makeRpcCall(`model.${model}.read`, [
        [recordId],
        fields,
        {}
      ]);
      
      if (data && data.length > 0) {
        console.log('✅ Datos del registro obtenidos:', data[0]);
        return data[0];
      } else {
        console.log('⚠️ No se encontraron datos del registro');
        return null;
      }
    } catch (error) {
      console.error('Error obteniendo datos del registro:', error);
      throw error;
    }
  }

  // Obtener opciones de un campo selection que tiene un método
  async getSelectionOptions(model, methodName, context = {}) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo opciones de selection para método: ${methodName} en modelo: ${model}`);
      
      // Llamar al método del modelo que devuelve las opciones
      const options = await this.makeRpcCall(`model.${model}.${methodName}`, [context]);
      
      console.log(`✅ Opciones obtenidas para ${methodName}:`, options);
      return options;
    } catch (error) {
      console.error(`Error obteniendo opciones de selection para ${methodName}:`, error);
      throw error;
    }
  }

  // Obtener opciones de acción cuando hay context_model
  async getActionOptions(menuId) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo opciones de acción para menú ID: ${menuId}`);
      
      const actionInfo = await this.makeRpcCall('model.ir.action.keyword.get_keyword', [
        'tree_open',
        ['ir.ui.menu', menuId],
        {}
      ]);
      
      if (actionInfo && actionInfo.length > 0) {
        // Mapear las opciones a un formato más simple para el modal
        const options = actionInfo.map((option, index) => ({
          index: index,
          id: option.id,
          name: option.name,
          resModel: option.res_model,
          contextModel: option.context_model,
          type: option.type,
          views: option.views || [],
          description: `${option.name} (${option.res_model})`
        }));
        
        console.log(`✅ Opciones de acción obtenidas:`, options);
        return {
          hasOptions: true,
          options: options,
          defaultIndex: 0
        };
      } else {
        return {
          hasOptions: false,
          options: [],
          defaultIndex: 0
        };
      }
    } catch (error) {
      console.error('Error obteniendo opciones de acción:', error);
      throw error;
    }
  }

  // Ejecutar acción seleccionada después de mostrar el modal
  async executeSelectedAction(menuId, selectedActionIndex) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Ejecutando acción seleccionada ${selectedActionIndex} para menú ID: ${menuId}`);
      
      // Obtener la información de la acción con el índice seleccionado
      const actionInfo = await this.getMenuActionInfo(menuId, selectedActionIndex);
      
      if (actionInfo.hasMultipleOptions && actionInfo.selectedOption) {
        const selectedOption = actionInfo.selectedOption;
        
        // Si la opción tiene context_model, mostrar modal con opciones de res_model
        if (selectedOption.contextModel) {
          console.log(`⚠️ La opción seleccionada requiere contexto: ${selectedOption.contextModel}`);
          
          // Obtener todas las opciones disponibles
          const allOptions = actionInfo.options;
          
          return {
            requiresContext: true,
            contextModel: selectedOption.contextModel,
            resModelOptions: allOptions, // Todas las opciones de res_model
            actionName: selectedOption.name,
            views: selectedOption.views,
            actionId: selectedOption.id
          };
        } else {
          // Acción directa sin contexto
          console.log(`✅ Ejecutando acción directa: ${selectedOption.resModel}`);
          
          // Obtener toolbar info para la acción directa
          const toolbarInfo = await this.makeRpcCall(`model.${selectedOption.resModel}.view_toolbar_get`, [{}]);
          
          return {
            requiresContext: false,
            resModel: selectedOption.resModel,
            actionName: selectedOption.name,
            views: selectedOption.views,
            toolbarInfo: toolbarInfo,
            actionId: selectedOption.id
          };
        }
      } else {
        throw new Error('No se pudo obtener la acción seleccionada');
      }
    } catch (error) {
      console.error('Error ejecutando acción seleccionada:', error);
      throw error;
    }
  }

  // Obtener información del contexto
  async getContextInfo(contextModel) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo información del contexto: ${contextModel}`);
      
      // Obtener la vista de formulario del contexto
      const contextFieldsView = await this.makeRpcCall(`model.${contextModel}.fields_view_get`, [
        null, // view_id - usar vista por defecto
        'form', // view_type
        {} // context
      ]);
      
      console.log(`✅ Vista del contexto obtenida:`, contextFieldsView);
      
      return {
        model: contextModel,
        fieldsView: contextFieldsView,
        fields: contextFieldsView.fields ? Object.keys(contextFieldsView.fields) : []
      };
    } catch (error) {
      console.error(`Error obteniendo información del contexto ${contextModel}:`, error);
      throw error;
    }
  }

  // Ejecutar opción específica de res_model
  async executeResModelOption(resModelOption) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Ejecutando opción de res_model: ${resModelOption.resModel}`);
      
      // PASO 1: Obtener fields_view_get para determinar el tipo de vista
      // Intentar primero con vista por defecto (sin especificar view_type)
      let fieldsView = await this.makeRpcCall(`model.${resModelOption.resModel}.fields_view_get`, [
        null, // view_id - usar vista por defecto
        null, // view_type - usar vista por defecto
        {}
      ]);
      
      console.log(`✅ Vista por defecto obtenida para ${resModelOption.resModel}:`, fieldsView);
      
      // Determinar el tipo de vista basado en la respuesta
      let viewType = fieldsView.type || 'tree';
      let viewId = fieldsView.view_id || null;
      
      console.log(`🎯 Tipo de vista determinado por fields_view_get: ${viewType}, ID: ${viewId}`);
      
      // PASO 2: Si no se pudo determinar el tipo, intentar con tipos específicos
      if (!viewType || viewType === 'unknown') {
        console.log(`⚠️ Tipo de vista no determinado, intentando con tipos específicos...`);
        
        // Intentar con 'tree' primero
        try {
          const treeView = await this.makeRpcCall(`model.${resModelOption.resModel}.fields_view_get`, [
            null,
            'tree',
            {}
          ]);
          if (treeView && treeView.type) {
            fieldsView = treeView;
            viewType = 'tree';
            viewId = treeView.view_id || null;
            console.log(`✅ Vista tree encontrada: ID ${viewId}`);
          }
        } catch (treeError) {
          console.log(`❌ No hay vista tree disponible:`, treeError.message);
        }
        
        // Si no hay tree, intentar con 'form'
        if (viewType !== 'tree') {
          try {
            const formView = await this.makeRpcCall(`model.${resModelOption.resModel}.fields_view_get`, [
              null,
              'form',
              {}
            ]);
            if (formView && formView.type) {
              fieldsView = formView;
              viewType = 'form';
              viewId = formView.view_id || null;
              console.log(`✅ Vista form encontrada: ID ${viewId}`);
            }
          } catch (formError) {
            console.log(`❌ No hay vista form disponible:`, formError.message);
          }
        }
      }
      
      console.log(`🎯 Tipo de vista final: ${viewType}, ID: ${viewId}`);
      
      // PASO 3: Procesar según el tipo de vista determinado
      let tableData = null;
      let formData = null;
      
      if (viewType === 'tree') {
        console.log(`📊 Procesando como tabla (tree)...`);
        
        // Obtener datos para tabla
        const searchParams = [[], 0, 100, null, {}];
        const ids = await this.makeRpcCall(`model.${resModelOption.resModel}.search`, searchParams);
        
        console.log(`📊 IDs encontrados: ${ids.length}`);
        
        if (ids.length > 0) {
          const fields = Object.keys(fieldsView.fields || {});
          const expandedFields = this.expandFieldsForRelations(fields, resModelOption.resModel);
          const data = await this.makeRpcCall(`model.${resModelOption.resModel}.read`, [ids, expandedFields, {}]);
          
          tableData = {
            fieldsView,
            data,
            model: resModelOption.resModel,
            viewId: viewId,
            viewType: viewType,
            fields: expandedFields
          };
          
          console.log(`✅ Datos de tabla preparados: ${data.length} registros`);
        } else {
          // Tabla vacía pero con estructura
          tableData = {
            fieldsView,
            data: [],
            model: resModelOption.resModel,
            viewId: viewId,
            viewType: viewType,
            fields: Object.keys(fieldsView.fields || {})
          };
          console.log(`📊 Tabla vacía preparada`);
        }
        
      } else if (viewType === 'form') {
        console.log(`📝 Procesando como formulario (form)...`);
        
        // Para formularios, crear un formulario vacío
        formData = {
          model: resModelOption.resModel,
          viewId: viewId,
          viewType: 'form',
          fieldsView: fieldsView,
          recordData: null // Formulario vacío
        };
        
        console.log(`✅ Formulario preparado`);
        
      } else {
        console.warn(`⚠️ Tipo de vista no reconocido: ${viewType}, usando como formulario por defecto`);
        
        // Fallback a formulario si no se reconoce el tipo
        formData = {
          model: resModelOption.resModel,
          viewId: viewId,
          viewType: 'form',
          fieldsView: fieldsView,
          recordData: null
        };
      }
      
      // PASO 4: Obtener toolbar info
      const toolbarInfo = await this.makeRpcCall(`model.${resModelOption.resModel}.view_toolbar_get`, [{}]);
      
      console.log(`✅ Toolbar obtenido para ${resModelOption.resModel}`);
      
      return {
        requiresContext: false,
        resModel: resModelOption.resModel,
        actionName: resModelOption.name,
        views: resModelOption.views || [[viewId, viewType]],
        toolbarInfo: toolbarInfo,
        viewType: viewType,
        viewId: viewId,
        tableData: tableData,
        formData: formData
      };
    } catch (error) {
      console.error('Error ejecutando opción de res_model:', error);
      throw error;
    }
  }

  // Ejecutar acción con contexto completado
  async executeActionWithContext(actionData, contextValues) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Ejecutando acción con contexto:`, { actionData, contextValues });
      
      // Obtener toolbar info con el contexto
      const toolbarInfo = await this.makeRpcCall(`model.${actionData.resModel}.view_toolbar_get`, [
        { context: contextValues }
      ]);
      
      console.log(`✅ Toolbar obtenido con contexto:`, toolbarInfo);
      
      // Determinar qué vista mostrar basado en las vistas disponibles
      let finalViewType = 'tree'; // por defecto
      let finalViewId = null;
      
      if (actionData.views && actionData.views.length > 0) {
        // Buscar vista tree primero, luego form
        const treeView = actionData.views.find(view => view[1] === 'tree');
        const formView = actionData.views.find(view => view[1] === 'form');
        
        const selectedView = treeView || formView || actionData.views[0];
        finalViewId = selectedView[0];
        finalViewType = selectedView[1];
      }
      
      console.log(`🎯 Vista final seleccionada: ID ${finalViewId}, Tipo ${finalViewType}`);
      
      // Obtener la vista de campos
      const fieldsView = await this.makeRpcCall(`model.${actionData.resModel}.fields_view_get`, [
        finalViewId,
        finalViewType,
        { context: contextValues }
      ]);
      
      console.log(`✅ Vista de campos obtenida:`, fieldsView);
      
      let tableData = null;
      let formData = null;
      
      if (finalViewType === 'tree') {
        // Obtener datos para tabla
        const searchParams = [[], 0, 100, null, { context: contextValues }];
        const ids = await this.makeRpcCall(`model.${actionData.resModel}.search`, searchParams);
        
        if (ids.length > 0) {
          const fields = Object.keys(fieldsView.fields || {});
          const expandedFields = this.expandFieldsForRelations(fields, actionData.resModel);
          const data = await this.makeRpcCall(`model.${actionData.resModel}.read`, [ids, expandedFields, { context: contextValues }]);
          
          tableData = {
            fieldsView,
            data,
            model: actionData.resModel,
            viewId: finalViewId,
            viewType: finalViewType,
            fields: expandedFields,
            context: contextValues
          };
        }
      } else if (finalViewType === 'form') {
        // Para formularios, crear un registro nuevo o obtener uno existente
        formData = {
          model: actionData.resModel,
          viewId: finalViewId,
          viewType: 'form',
          fieldsView: fieldsView,
          recordData: null, // Formulario vacío
          context: contextValues
        };
      }
      
      return {
        requiresContext: false,
        resModel: actionData.resModel,
        actionName: actionData.actionName,
        views: actionData.views,
        toolbarInfo: toolbarInfo,
        viewType: finalViewType,
        viewId: finalViewId,
        tableData: tableData,
        formData: formData,
        contextValues: contextValues
      };
    } catch (error) {
      console.error('Error ejecutando acción con contexto:', error);
      throw error;
    }
  }

  // Crear un nuevo registro
  async createRecord(model, values) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Creando nuevo registro en modelo: ${model}`, values);
      
      const result = await this.makeRpcCall(`model.${model}.create`, [[values]]);
      
      console.log('Registro creado:', result);
      return result;
    } catch (error) {
      console.error('Error creando registro:', error);
      throw error;
    }
  }

  // Actualizar un registro existente
  async updateRecord(model, recordId, values) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Actualizando registro ${recordId} en modelo: ${model}`, values);
      
      const result = await this.makeRpcCall(`model.${model}.write`, [[recordId], values]);
      
      console.log('Registro actualizado:', result);
      return result;
    } catch (error) {
      console.error('Error actualizando registro:', error);
      throw error;
    }
  }

  // Eliminar un registro
  async deleteRecord(model, recordId) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Eliminando registro ${recordId} en modelo: ${model}`);
      
      const result = await this.makeRpcCall(`model.${model}.delete`, [[recordId]]);
      
      console.log('Registro eliminado:', result);
      return result;
    } catch (error) {
      console.error('Error eliminando registro:', error);
      throw error;
    }
  }

  // Obtener pacientes de GNU Health de forma segura
  async getPatientsSafe({
    model = 'gnuhealth.patient',
    domain = [],
    wantedFields = [
      'id',
      'active',
      'age',
      'deceased',
      'gender',
      'lastname',
      'party',
      'patient_status',
      'puid',
      'gender:string',
      'party.rec_name',
      'rec_name',
      '_timestamp',
      '_write',
      '_delete'
    ],
    offset = 0,
    limit = 1000,
    order = [['party', 'ASC'], ['id', null]],
    computeAge = true    // si true, agrega .age calculada si existe birth_date/dob
  } = {}) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {

      // 1) Usar campos directamente
      let fields = wantedFields;

      // 2) Asegurar que el contexto esté cargado
      if (!this.context || Object.keys(this.context).length === 0) {
        await this.loadUserContext();
      }
      
      // 3) Hacer la búsqueda en dos pasos
      // PASO 1: Obtener IDs de pacientes con search
      const searchParams = [domain, offset, limit, order, {}];
      const patientIds = await this.makeRpcCall(`model.${model}.search`, searchParams);
      
      
      if (patientIds.length === 0) {
        return [];
      }
      
      // PASO 2: Obtener datos completos con read
      const readParams = [patientIds, fields, {}];
      const rows = await this.makeRpcCall(`model.${model}.read`, readParams);

      return rows;
    } catch (error) {
      console.error('Error obteniendo pacientes:', error);
      throw error;
    }
  }

}

export default new TrytonService();

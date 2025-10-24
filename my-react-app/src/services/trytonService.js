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
      // Para métodos de wizard, el contexto debe agregarse al final sin interferir
      if (method.startsWith('wizard.')) {
        // Para wizards, simplemente agregar el contexto al final
        rpcParams.push({ ...this.context });
      } else if (method === 'common.db.login') {
        // Para login, NO agregar contexto adicional - ya tiene el formato correcto
        // El login ya tiene sus 4 parámetros: username, password, language, context
      } else {
        // Para otros métodos, mezclar con el último parámetro como antes
        const lastParam = rpcParams.pop() || {};
        // Solo mezclar si el último parámetro es un objeto
        if (typeof lastParam === 'object' && lastParam !== null) {
          rpcParams.push({ ...this.context, ...lastParam });
        } else {
          // Si el último parámetro no es un objeto, agregar el contexto al final
          rpcParams.push(lastParam);
          rpcParams.push({ ...this.context });
        }
      }
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
        {
          device_cookie: "a8e18b090c9c40989af64040c0ec9f1f",
          password: password
        },
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
            iconName: submenu['icon:string'] || null,
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
                  iconName: menu['icon:string'] || null,
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
                  ['name', 'icon', 'icon:string', 'sequence', 'childs', 'model', 'description']
                ]);

                if (menuDetails && menuDetails.length > 0) {
                  const menu = menuDetails[0];

                  // Obtener submenús si existen
                  const submenus = await this.getSubmenus(menu.childs);

                  menuItems.push({
                    id: menu.id,
                    name: menu.name || `Menú ${menu.id}`,
                    icon: menu.icon || '📋',
                    iconName: menu['icon:string'] || null,
                    model: menu.model || '',
                    description: menu.description || menu.name || `Menú ${menu.id}`,
                    sequence: menu.sequence || 0,
                    childs: submenus
                  });
                }
              } catch (individualError) {
                console.warn(`Error obteniendo detalles del menú ${menuIdObj.id}:`, individualError.message);
                // Agregar menú básico como fallback
                menuItems.push({
                  id: menuIdObj.id,
                  name: `Menú ${menuIdObj.id}`,
                  icon: '📋',
                  iconName: null,
                  model: '',
                  description: `Menú ${menuIdObj.id}`,
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
                  iconName: menu['icon:string'] || null,
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
                  iconName: menu['icon:string'] || null,
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
                    ['name', 'icon', 'icon:string', 'sequence', 'childs', 'model', 'description']
                  ]);

                  if (menuDetails && menuDetails.length > 0) {
                    const menu = menuDetails[0];

                    // Obtener submenús si existen
                    const submenus = await this.getSubmenus(menu.childs);

                    menuItems.push({
                      id: menu.id,
                      name: menu.name || `Menú ${menu.id}`,
                      icon: menu.icon || '📋',
                      iconName: menu['icon:string'] || null,
                      model: menu.model || '',
                      description: menu.description || menu.name || `Menú ${menu.id}`,
                      sequence: menu.sequence || 0,
                      childs: submenus
                    });
                  }
                } catch (individualError) {
                  console.warn(`Error obteniendo detalles del menú ${menuIdObj.id}:`, individualError.message);
                  // Agregar menú básico como fallback
                  menuItems.push({
                    id: menuIdObj.id,
                    name: `Menú ${menuIdObj.id}`,
                    icon: '📋',
                    iconName: null,
                    model: '',
                    description: `Menú ${menuIdObj.id}`,
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

      // Extraer todos los nombres de iconos del menú (recursivamente)
      const extractIconNames = (items) => {
        const iconNames = new Set();
        const traverse = (menuItems) => {
          for (const item of menuItems) {
            // Solo agregar si iconName es un string válido (no null, no emoji, no número)
            if (item.iconName &&
                typeof item.iconName === 'string' &&
                item.iconName !== '📋' &&
                item.iconName.trim() !== '' &&
                isNaN(Number(item.iconName))) {
              iconNames.add(item.iconName);
            }
            if (item.childs && item.childs.length > 0) {
              traverse(item.childs);
            }
          }
        };
        traverse(items);
        return Array.from(iconNames);
      };

      // Intentar cargar iconos, pero no fallar si hay error
      try {
        const iconNames = extractIconNames(menuItems);

        // Precargar todos los iconos en batch
        const iconUrls = await this.preloadIcons(iconNames, '#267f82');

        // Agregar URLs de iconos a los elementos del menú (recursivamente)
        const addIconUrls = (items) => {
          for (const item of items) {
            if (item.iconName && iconUrls[item.iconName]) {
              item.iconUrl = iconUrls[item.iconName];
            }
            if (item.childs && item.childs.length > 0) {
              addIconUrls(item.childs);
            }
          }
        };

        addIconUrls(menuItems);
      } catch (iconError) {
        console.warn('⚠️ No se pudieron cargar los iconos SVG, usando iconos por defecto:', iconError.message);
        // Continuar sin iconos SVG
      }

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

        if (selectedAction.type === 'ir.action.wizard') {
          // CASO: Es un wizard
          console.log(`🧙 Wizard detectado: ${selectedAction.wiz_name}`);

          return {
            actionInfo: actionInfo,
            toolbarInfo: null,
            resModel: null,
            contextModel: null,
            actionName: selectedAction.name,
            hasMultipleOptions: false,
            isWizard: true,
            wizardName: selectedAction.wiz_name,
            wizardId: selectedAction.id,
            selectedOption: {
              index: selectedActionIndex,
              id: selectedAction.id,
              name: selectedAction.name,
              type: selectedAction.type,
              wiz_name: selectedAction.wiz_name,
              records: selectedAction.records
            }
          };
        } else if (selectedAction.context_model) {
          // CASO: Hay context_model - múltiples opciones disponibles
          console.log(`⚠️ Múltiples opciones disponibles (${actionInfo.length}). Usando índice ${selectedActionIndex}`);

          return {
            actionInfo: actionInfo,
            toolbarInfo: null,
            resModel: selectedAction.res_model,
            contextModel: selectedAction.context_model,
            actionName: selectedAction.name,
            hasMultipleOptions: true,
            isWizard: false,
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

        // PASO 4: Obtener la vista de campos para determinar el tipo de vista
        let fieldsView = null;
        let viewType = null;
        let viewId = null;

        // Verificar si hay vistas especificadas en la acción
        if (selectedAction.views && selectedAction.views.length > 0) {
          console.log(`📋 Vistas disponibles en la acción:`, selectedAction.views);

          // Buscar vista tree primero, luego form
          const treeView = selectedAction.views.find(view => view[1] === 'tree');
          const formView = selectedAction.views.find(view => view[1] === 'form');

          // Priorizar tree view si existe, sino usar form view
          const selectedView = treeView || formView || selectedAction.views[0];
          viewId = selectedView[0];
          viewType = selectedView[1];

          console.log(`🎯 Vista seleccionada: ID=${viewId}, tipo="${viewType}"`);

          // Obtener la vista de campos con el ID y tipo específicos
          try {
            fieldsView = await this.makeRpcCall(`model.${resModel}.fields_view_get`, [
              viewId,
              viewType,
              {}
            ]);

            if (fieldsView) {
              // Usar el tipo real que devuelve Tryton
              const realViewType = fieldsView.type || viewType;
              viewType = realViewType;
              viewId = fieldsView.view_id || viewId;
              console.log(`✅ Vista obtenida para ${resModel}: ID=${viewId}, tipo solicitado="${selectedView[1]}", tipo real="${realViewType}"`);
            }
          } catch (viewError) {
            console.log(`❌ Error obteniendo vista específica:`, viewError.message);
          }
        } else {
          // Fallback al método anterior si no hay vistas especificadas
          console.log(`⚠️ No hay vistas especificadas en la acción, usando método por defecto`);

          try {
            // Intentar obtener vista tree primero (más común para tablas)
            fieldsView = await this.makeRpcCall(`model.${resModel}.fields_view_get`, [
              null, // view_id - usar vista por defecto
              'tree', // view_type - intentar tree primero
              {}
            ]);

            if (fieldsView) {
              // Usar el tipo real que devuelve Tryton, no el solicitado
              viewType = fieldsView.type || 'tree';
              viewId = fieldsView.view_id || null;
              console.log(`✅ Vista obtenida para ${resModel}: solicitado tree, Tryton devuelve "${fieldsView.type}", usando "${viewType}", ID: ${viewId}`);
            }
          } catch (treeError) {
            console.log(`❌ No hay vista tree disponible para ${resModel}:`, treeError.message);

            // Si tree falló, intentar con form
            try {
              fieldsView = await this.makeRpcCall(`model.${resModel}.fields_view_get`, [
                null,
                'form',
                {}
              ]);

              if (fieldsView) {
                // Usar el tipo real que devuelve Tryton, no el solicitado
                viewType = fieldsView.type || 'form';
                viewId = fieldsView.view_id || null;
                console.log(`✅ Vista obtenida para ${resModel}: solicitado form, Tryton devuelve "${fieldsView.type}", usando "${viewType}", ID: ${viewId}`);
              }
            } catch (formError) {
              console.log(`❌ No hay vista form disponible para ${resModel}:`, formError.message);
            }
          }
        }

        return {
          actionInfo: actionInfo,
          toolbarInfo: toolbarInfo,
          resModel: resModel,
          actionName: actionName,
          hasMultipleOptions: false,
          fieldsView: fieldsView,
          viewType: viewType,
          viewId: viewId,
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

      // PASO 2: Verificar que la vista es realmente del tipo solicitado
      if (fieldsView && fieldsView.type && fieldsView.type !== viewType) {
        throw new Error(`View is not of type "${viewType}" (current type: ${fieldsView.type})`);
      }

      // PASO 3: Extraer campos de la vista
      const fields = fieldsView.fields ? Object.keys(fieldsView.fields) : [];

      // PASO 4: Obtener datos
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

      // PASO 2: Verificar que la vista es realmente del tipo solicitado
      if (fieldsView && fieldsView.type && fieldsView.type !== viewType) {
        throw new Error(`View is not of type "${viewType}" (current type: ${fieldsView.type})`);
      }

      // PASO 3: Extraer campos de la vista
      const fields = fieldsView.fields ? Object.keys(fieldsView.fields) : [];

      // PASO 4: Expandir campos para incluir relaciones many2one
      const expandedFields = this.expandFieldsForRelationsFromFieldsView(fields, fieldsView);
      console.log(`Campos expandidos para formulario:`, expandedFields);

      // PASO 5: Si hay recordId, obtener datos del registro con campos expandidos
      let data = null;
      if (recordId) {
        const ids = await this.makeRpcCall(`model.${model}.search`, [[['id', '=', recordId]], 0, 1]);
        if (ids.length > 0) {
          const dataArray = await this.makeRpcCall(`model.${model}.read`, [ids, expandedFields, {}]);
          if (dataArray && dataArray.length > 0) {
            data = dataArray[0];
          }
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

  // Expandir campos para incluir relaciones basándose en fieldsView
  expandFieldsForRelationsFromFieldsView(fields, fieldsView) {
    const expandedFields = [...fields];

    if (!fieldsView.fields) {
      return expandedFields;
    }

    // Recorrer todos los campos y expandir los many2one
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      if (fieldDef.type === 'many2one' && fields.includes(fieldName)) {
        // Agregar .rec_name para obtener el nombre legible
        // Tryton devuelve campo. (con punto) en la respuesta
        if (!expandedFields.includes(`${fieldName}.rec_name`)) {
          expandedFields.push(`${fieldName}.rec_name`);
          console.log(`Agregando campo relacionado many2one: ${fieldName}.rec_name`);
        }
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

  // Obtener valores por defecto para crear un nuevo registro
  async getDefaultValues(model, fieldsView = null) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Obteniendo valores por defecto para modelo: ${model}`);

      // Si no se proporciona fieldsView, obtenerlo
      let fields = [];
      if (fieldsView && fieldsView.fields) {
        fields = Object.keys(fieldsView.fields);
        console.log('📋 Usando campos de fieldsView proporcionado:', fields);
      } else {
        // Obtener vista de formulario para extraer los nombres de campos
        console.log('📋 Obteniendo vista de formulario para extraer campos...');
        const formView = await this.getFieldsView(model, null, 'form');
        if (formView && formView.fields) {
          fields = Object.keys(formView.fields);
          console.log('📋 Campos extraídos de vista de formulario:', fields);
        } else {
          console.warn('⚠️ No se pudieron obtener campos de la vista, usando lista básica');
          // Lista básica de campos comunes
          fields = ['active', 'name', 'rec_name'];
        }
      }

      // Obtener valores por defecto pasando los nombres de campos
      const defaultValues = await this.makeRpcCall(`model.${model}.default_get`, [fields, {}]);

      console.log('✅ Valores por defecto obtenidos:', defaultValues);
      return defaultValues;
    } catch (error) {
      console.error('Error obteniendo valores por defecto:', error);
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

  // Autocomplete para campos many2one
  async autocomplete(model, searchText, domain = [], limit = 1000) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🔍 Autocomplete para modelo: ${model}, búsqueda: "${searchText}"`);
      console.log(`📋 Domain original:`, domain);

      // Evaluar domain PYSON si es necesario
      const evaluatedDomain = this.evaluatePysonDomain(domain);
      console.log(`📋 Domain evaluado:`, evaluatedDomain);

      // Llamar al método autocomplete del modelo
      // Parámetros: [searchText, domain, limit, order, context]
      // El contexto se agrega automáticamente en makeRpcCall como último parámetro
      const results = await this.makeRpcCall(`model.${model}.autocomplete`, [
        searchText,
        evaluatedDomain,
        limit,
        null,  // order (null para usar orden por defecto)
        {}     // context placeholder - makeRpcCall lo mezclará con this.context
      ]);

      console.log(`✅ Resultados de autocomplete:`, results);
      return results;
    } catch (error) {
      console.error(`Error en autocomplete para ${model}:`, error);
      throw error;
    }
  }

  // Evaluar domain PYSON simple (evalúa objetos __class__ comunes)
  evaluatePysonDomain(domain) {
    if (!domain || !Array.isArray(domain)) {
      return domain;
    }

    const evaluateValue = (value) => {
      // Si es un objeto PYSON
      if (value && typeof value === 'object' && value.__class__) {
        switch (value.__class__) {
          case 'Get':
            // Get obtiene un valor del contexto
            // {"__class__": "Get", "v": {"__class__": "Eval", "v": "context", "d": {}}, "k": "company", "d": -1}
            // Intenta obtener context[company], si no existe usa el default (d)
            if (value.k === 'company' && this.context && this.context.company) {
              return this.context.company;
            }
            return value.d; // default value

          case 'Eval':
            // Eval evalúa una expresión en el contexto
            // {"__class__": "Eval", "v": "context", "d": {}}
            if (value.v === 'context') {
              return this.context || value.d;
            }
            return value.d; // default value

          case 'If':
            // If evalúa una condición y devuelve un valor u otro
            // {"__class__": "If", "c": condition, "t": true_value, "e": false_value}
            const condition = evaluateValue(value.c);
            if (condition) {
              return evaluateValue(value.t);
            } else {
              return evaluateValue(value.e);
            }

          case 'Equal':
            // Equal compara dos valores
            // {"__class__": "Equal", "s1": value1, "s2": value2}
            const s1 = evaluateValue(value.s1);
            const s2 = evaluateValue(value.s2);
            return s1 === s2;

          case 'In':
            // In verifica si un valor está en una lista
            // {"__class__": "In", "s1": value, "s2": list}
            const searchValue = evaluateValue(value.s1);
            const searchList = evaluateValue(value.s2);
            if (Array.isArray(searchList)) {
              return searchList.includes(searchValue);
            }
            return false;

          default:
            console.warn(`⚠️ PYSON class no soportada: ${value.__class__}, usando valor por defecto`);
            return value.d || null;
        }
      }

      // Si es un array, evaluar recursivamente
      if (Array.isArray(value)) {
        return value.map(v => evaluateValue(v));
      }

      // Valor simple, retornar como está
      return value;
    };

    // Evaluar cada cláusula del domain
    return domain.map(clause => {
      if (Array.isArray(clause)) {
        // Una cláusula es [field, operator, value]
        if (clause.length >= 3) {
          return [
            clause[0], // field name
            clause[1], // operator
            evaluateValue(clause[2]) // value (evaluar PYSON)
          ];
        }
        // Cláusulas especiales como ['AND', ...] o ['OR', ...]
        return clause.map(c => evaluateValue(c));
      }
      return clause;
    });
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

  // Crear y obtener información de wizard
  async createWizard(wizardName) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🧙 Creando wizard: ${wizardName}`);

      // Crear el wizard
      const createResult = await this.makeRpcCall(`wizard.${wizardName}.create`, []);

      console.log(`✅ Wizard creado:`, createResult);

      // El resultado debería ser [wizardId, state, ...]
      if (createResult && Array.isArray(createResult) && createResult.length >= 2) {
        const wizardId = createResult[0];
        const state = createResult[1];

        console.log(`🎯 Wizard ID: ${wizardId}, Estado inicial: ${state}`);

        // Guardar el estado inicial en el contexto para uso posterior
        if (!this.wizardStates) {
          this.wizardStates = new Map();
        }
        this.wizardStates.set(wizardId, state);

        return {
          wizardId: wizardId,
          state: state,
          createResult: createResult
        };
      } else {
        throw new Error(`Respuesta inesperada al crear wizard: ${JSON.stringify(createResult)}`);
      }
    } catch (error) {
      console.error('Error creando wizard:', error);
      throw error;
    }
  }

  // Obtener formulario de wizard
  async getWizardForm(wizardName, wizardId) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🧙 Obteniendo formulario de wizard: ${wizardName}, ID: ${wizardId}`);
      // Obtener el estado actual del wizard (el que devolvió el .create)
      const currentState = await this.getCurrentWizardState(wizardName, wizardId);

      // Ejecutar el wizard para obtener el formulario
      // Los parámetros correctos son: [wizardId, data, stateName]
      // Para obtener el formulario inicial, usamos el estado actual y datos vacíos
      const executeResult = await this.makeRpcCall(`wizard.${wizardName}.execute`, [
        wizardId,
        {},               // data (vacío para el formulario inicial)
        currentState      // state_name (estado actual del wizard)
      ]);

      console.log(`✅ Formulario de wizard obtenido:`, executeResult);

      if (executeResult && executeResult.view) {
        const view = executeResult.view;

        return {
          wizardId: wizardId,
          state: executeResult.state || view.state,
          fieldsView: view.fields_view,
          defaults: view.defaults || {},
          values: view.values || {},
          buttons: view.buttons || [],
          model: view.fields_view?.model || wizardName
        };
      } else {
        throw new Error(`Respuesta inesperada al ejecutar wizard: ${JSON.stringify(executeResult)}`);
      }
    } catch (error) {
      console.error('Error obteniendo formulario de wizard:', error);
      throw error;
    }
  }

  // Ejecutar acción de wizard (submit)
  async executeWizardAction(wizardName, wizardId, values, buttonState) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🧙 Ejecutando acción de wizard: ${wizardName}, ID: ${wizardId}, Estado: ${buttonState}`);
      console.log(`📝 Valores:`, values);

      // Envolver los valores en un objeto con el nombre del estado actual del wizard
      // Tryton usa el estado actual del wizard, no el estado del botón
      // El estado actual puede variar: "start", "test", etc., dependiendo del modelo y el .create
      const currentWizardState = await this.getCurrentWizardState(wizardName, wizardId);
      const wrappedValues = {
        [currentWizardState]: values
      };

      console.log(`📦 Valores envueltos para Tryton:`, wrappedValues);

      // Ejecutar la acción del wizard con los valores envueltos
      // Los parámetros correctos son: [wizardId, data, stateName]
      // El contexto se incluye automáticamente en la llamada RPC
      const executeResult = await this.makeRpcCall(`wizard.${wizardName}.execute`, [
        wizardId,
        wrappedValues,  // data (valores envueltos en el estado)
        buttonState     // state_name (ej: 'request', 'end', etc.)
      ]);

      console.log(`✅ Acción de wizard ejecutada:`, executeResult);

      return executeResult;
    } catch (error) {
      console.error('Error ejecutando acción de wizard:', error);
      throw error;
    }
  }

  // Eliminar wizard
  async deleteWizard(wizardName, wizardId) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🧙 Eliminando wizard: ${wizardName}, ID: ${wizardId}`);

      // Eliminar el wizard
      const deleteResult = await this.makeRpcCall(`wizard.${wizardName}.delete`, [wizardId]);

      // Limpiar el estado guardado del wizard
      if (this.wizardStates && this.wizardStates.has(wizardId)) {
        this.wizardStates.delete(wizardId);
        console.log(`🧹 Estado del wizard ${wizardId} eliminado de la caché`);
      }

      console.log(`✅ Wizard eliminado:`, deleteResult);

      return deleteResult;
    } catch (error) {
      console.error('Error eliminando wizard:', error);
      throw error;
    }
  }

  // Obtener el estado actual del wizard
  async getCurrentWizardState(wizardName, wizardId) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🔍 Obteniendo estado actual del wizard: ${wizardName}, ID: ${wizardId}`);

      // Primero intentar obtener el estado guardado del .create
      if (this.wizardStates && this.wizardStates.has(wizardId)) {
        const savedState = this.wizardStates.get(wizardId);
        console.log(`✅ Estado guardado del wizard: ${savedState}`);
        return savedState;
      }

      // Si no hay estado guardado, intentar con diferentes estados comunes
      const possibleStates = ['start', 'test', 'request', 'end'];

      for (const state of possibleStates) {
        try {
          console.log(`🔍 Probando estado: ${state}`);

          const result = await this.makeRpcCall(`wizard.${wizardName}.execute`, [
            wizardId,
            {},       // data vacío
            state     // probar este estado
          ]);

          console.log(`✅ Estado ${state} funcionó:`, result);

          // Si no hay error, este es el estado correcto
          // El estado actual está en result.state o en el segundo elemento del array
          let currentState = state;

          if (result && typeof result === 'object') {
            if (result.state) {
              currentState = result.state;
            } else if (Array.isArray(result) && result.length >= 2) {
              // Si es un array, el estado puede estar en diferentes posiciones
              if (typeof result[1] === 'string') {
                currentState = result[1];
              } else if (result.length >= 3 && typeof result[2] === 'string') {
                currentState = result[2];
              }
            }
          }

          // Guardar el estado encontrado para futuras referencias
          if (!this.wizardStates) {
            this.wizardStates = new Map();
          }
          this.wizardStates.set(wizardId, currentState);

          console.log(`✅ Estado actual del wizard: ${currentState}`);
          return currentState;

        } catch (stateError) {
          console.log(`❌ Estado ${state} falló:`, stateError.message);
          // Continuar con el siguiente estado
        }
      }

      // Si todos los estados fallaron, usar fallback
      console.warn('Todos los estados fallaron, usando fallback "start"');
      return 'start';

    } catch (error) {
      console.warn('Error obteniendo estado del wizard, usando fallback "start":', error.message);
      return 'start'; // fallback por defecto
    }
  }

  // Ejecutar opción específica de res_model
  async executeResModelOption(resModelOption) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`Ejecutando opción de res_model: ${resModelOption.resModel}`);

      // PASO 1: Intentar obtener fields_view_get con diferentes estrategias
      let fieldsView = null;
      let viewType = null;
      let viewId = null;

      // Estrategia 1: Intentar con 'tree' primero (más común para reportes)
      try {
        fieldsView = await this.makeRpcCall(`model.${resModelOption.resModel}.fields_view_get`, [
          null, // view_id - usar vista por defecto
          'tree', // view_type - intentar tree primero
          {}
        ]);

        if (fieldsView) {
          // Usar el tipo real que devuelve Tryton, no el solicitado
          viewType = fieldsView.type || 'tree';
          viewId = fieldsView.view_id || null;
          console.log(`✅ Vista obtenida para ${resModelOption.resModel}: solicitado tree, Tryton devuelve "${fieldsView.type}", usando "${viewType}", ID: ${viewId}`);
        }
      } catch (treeError) {
        console.log(`❌ No hay vista tree disponible para ${resModelOption.resModel}:`, treeError.message);
      }

      // Estrategia 2: Si tree falló, intentar con 'form'
      if (!viewType || !fieldsView) {
        try {
          fieldsView = await this.makeRpcCall(`model.${resModelOption.resModel}.fields_view_get`, [
            null,
            'form',
            {}
          ]);

          if (fieldsView) {
            // Usar el tipo real que devuelve Tryton, no el solicitado
            viewType = fieldsView.type || 'form';
            viewId = fieldsView.view_id || null;
            console.log(`✅ Vista obtenida para ${resModelOption.resModel}: solicitado form, Tryton devuelve "${fieldsView.type}", usando "${viewType}", ID: ${viewId}`);
          }
        } catch (formError) {
          console.log(`❌ No hay vista form disponible para ${resModelOption.resModel}:`, formError.message);
        }
      }

      // Estrategia 3: Si todo falla, intentar sin especificar view_type
      if (!viewType || !fieldsView) {
        try {
          fieldsView = await this.makeRpcCall(`model.${resModelOption.resModel}.fields_view_get`, [
            null,
            null, // Sin especificar view_type
            {}
          ]);

          if (fieldsView) {
            // Usar el tipo que devuelve Tryton cuando no especificamos view_type
            viewType = fieldsView.type || 'form';
            viewId = fieldsView.view_id || null;
            console.log(`✅ Vista por defecto obtenida para ${resModelOption.resModel}: ${viewType}, ID: ${viewId}`);
          }
        } catch (defaultError) {
          console.log(`❌ No hay vista por defecto disponible para ${resModelOption.resModel}:`, defaultError.message);
        }
      }

      console.log(`🎯 Tipo de vista final: ${viewType}, ID: ${viewId}`);

      // Si ninguna estrategia funcionó, lanzar error
      if (!viewType || !fieldsView) {
        throw new Error(`No se pudo obtener vista para el modelo ${resModelOption.resModel}. No hay vistas tree, form o por defecto disponibles.`);
      }

      // PASO 2: Procesar según el tipo de vista determinado
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

      // PASO 3: Obtener toolbar info
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

      // Tryton write() expects: write(records, values, context)
      // where records is a list of IDs and values is a dictionary
      const result = await this.makeRpcCall(`model.${model}.write`, [
        [recordId],  // Lista de IDs
        values,      // Diccionario de valores
        {}           // Contexto (se agregará automáticamente en makeRpcCall)
      ]);

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


  async listIcons() {
    try {
      const result = await this.makeRpcCall('model.ir.ui.icon.list_icons', [{}]);

      return result || []; // Returns: [[1, 'tryton-list'], [2, 'tryton-star'], ...]
    } catch (error) {
      console.error('❌ Error listing icons:', error);
      throw error;
    }
  }

  async getIconData(iconIds) {
    if (!iconIds || iconIds.length === 0) {
      return [];
    }

    try {
      const result = await this.makeRpcCall('model.ir.ui.icon.read', [
        iconIds,
        ['name', 'icon'],
        {}
      ]);

      return result;
    } catch (error) {
      console.error('❌ Error getting icon data:', error);
      throw error;
    }
  }

  convertSvgToUrl(svgData, color = '#267f82') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(svgData, 'image/svg+xml');

      const svgElement = xmlDoc.querySelector('svg');
      if (svgElement) {
        svgElement.setAttribute('fill', color);
      }

      const serializer = new XMLSerializer();
      const modifiedSvg = serializer.serializeToString(xmlDoc);

      const blob = new Blob([modifiedSvg], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error converting SVG to URL:', error);
      return '';
    }
  }


  async getIconUrl(iconName, color = '#267f82') {
    if (!iconName) {
      return '';
    }

    try {
      // CheQquear si está en caché
      if (this.iconCache && this.iconCache[iconName]) {
        return this.iconCache[iconName];
      }

      // Innicializar caché si no existe
      if (!this.iconCache) {
        this.iconCache = {};
      }

      // Conseguir el icon ID del nombre
      if (!this.iconNameToId) {
        const iconList = await this.listIcons();
        this.iconNameToId = {};
        iconList.forEach(([id, name]) => {
          this.iconNameToId[name] = id;
        });
      }

      const iconId = this.iconNameToId[iconName];
      if (!iconId) {
        console.warn(`Icon not found: ${iconName}`);
        return '';
      }

      //  CConseguir la data del SVG
      const iconData = await this.getIconData([iconId]);
      if (iconData.length === 0 || !iconData[0].icon) {
        console.warn(`No SVG data for icon: ${iconName}`);
        return '';
      }

      // Convertir a URL y cache
      const url = this.convertSvgToUrl(iconData[0].icon, color);
      this.iconCache[iconName] = url;

      return url;
    } catch (error) {
      console.error(`Error getting icon URL for ${iconName}:`, error);
      return '';
    }
  }


  async preloadIcons(iconNames, color = '#267f82') {
    if (!iconNames || iconNames.length === 0) {
      return {};
    }

    try {
      console.log(`🔄 Preloading ${iconNames.length} icons...`);

      if (!this.iconNameToId) {
        const iconList = await this.listIcons();
        this.iconNameToId = {};
        iconList.forEach(([id, name]) => {
          this.iconNameToId[name] = id;
        });
      }

      const iconIds = iconNames
        .map(name => this.iconNameToId[name])
        .filter(id => id);

      if (iconIds.length === 0) {
        console.warn('No valid icon IDs found for preloading');
        return {};
      }

      // Fetch all SVG data at once
      const iconsData = await this.getIconData(iconIds);

      // Initialize cache if not exists
      if (!this.iconCache) {
        this.iconCache = {};
      }

      // Convert all to URLs and cache
      const iconMap = {};
      iconsData.forEach(iconData => {
        const url = this.convertSvgToUrl(iconData.icon, color);
        this.iconCache[iconData.name] = url;
        iconMap[iconData.name] = url;
      });

      console.log(`✅ Preloaded ${Object.keys(iconMap).length} icons`);
      return iconMap;
    } catch (error) {
      console.error('Error preloading icons:', error);
      return {};
    }
  }

  /**
   * Clear icon cache (useful for theme changes)
   */
  clearIconCache() {
    if (this.iconCache) {
      // Revoke all blob URLs to free memory
      Object.values(this.iconCache).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      this.iconCache = {};
    }
    this.iconNameToId = null;
    console.log('🧹 Icon cache cleared');
  }

  // Email-related methods

  // Get record data for email (id and rec_name)
  async getRecordData(model, recordId, fields = ['id', 'rec_name']) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`📧 Getting record data for email: ${model} - ${recordId}`);
      
      // model.read expects a list of IDs, not a single ID
      const recordData = await this.makeRpcCall(`model.${model}.read`, [[recordId], fields, {}]);
      
      console.log('✅ Record data for email:', recordData);
      // Return the first (and only) record from the array
      return recordData[0];
    } catch (error) {
      console.error('Error getting record data for email:', error);
      throw error;
    }
  }

  // Get default email template
  async getEmailTemplateDefault(model, recordId) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`📧 Getting default email template for: ${model} - ${recordId}`);
      
      const templateData = await this.makeRpcCall('model.ir.email.template.get_default', [model, recordId]);
      
      console.log('✅ Email template data:', templateData);
      return templateData;
    } catch (error) {
      console.error('Error getting email template:', error);
      throw error;
    }
  }

  // Get email completion suggestions
  async getEmailComplete(query, limit = 1000) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`📧 Getting email completions for: ${query} (limit: ${limit})`);
      
      const completions = await this.makeRpcCall('model.ir.email.complete', [query, limit]);
      
      console.log('✅ Email completions:', completions);
      return completions;
    } catch (error) {
      console.error('Error getting email completions:', error);
      throw error;
    }
  }

  // Handle relate action - get toolbar info and fields view for related model
  async handleRelateAction(relateItem, contextModel = null, contextId = null) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🔗 Handling relate action:`, relateItem);
      console.log(`📋 Context model: ${contextModel}, Context ID: ${contextId}`);

      const resModel = relateItem.res_model;
      const actionName = relateItem.name || `Relate ${resModel}`;

      // PASO 1: Obtener toolbar info del modelo relacionado
      console.log(`🔍 Getting toolbar info for model: ${resModel}`);
      const toolbarInfo = await this.makeRpcCall(`model.${resModel}.view_toolbar_get`, [{}]);

      console.log('✅ Toolbar info obtained:', toolbarInfo);

      // PASO 2: Obtener fields_view_get del modelo relacionado
      let fieldsView = null;
      let viewType = null;
      let viewId = null;

      // Intentar obtener vista tree primero (más común para relaciones)
      try {
        fieldsView = await this.makeRpcCall(`model.${resModel}.fields_view_get`, [
          null, // view_id - usar vista por defecto
          'tree', // view_type - intentar tree primero
          {}
        ]);

        if (fieldsView) {
          viewType = fieldsView.type || 'tree';
          viewId = fieldsView.view_id || null;
          console.log(`✅ Tree view obtained for ${resModel}: ${viewType}, ID: ${viewId}`);
        }
      } catch (treeError) {
        console.log(`❌ No tree view available for ${resModel}:`, treeError.message);
      }

      // Si tree falló, intentar con form
      if (!fieldsView) {
        try {
          fieldsView = await this.makeRpcCall(`model.${resModel}.fields_view_get`, [
            null,
            'form',
            {}
          ]);

          if (fieldsView) {
            viewType = fieldsView.type || 'form';
            viewId = fieldsView.view_id || null;
            console.log(`✅ Form view obtained for ${resModel}: ${viewType}, ID: ${viewId}`);
          }
        } catch (formError) {
          console.log(`❌ No form view available for ${resModel}:`, formError.message);
        }
      }

      if (!fieldsView) {
        throw new Error(`No se pudo obtener vista para el modelo relacionado ${resModel}`);
      }

      // PASO 3: Procesar según el tipo de vista
      let tableData = null;
      let formData = null;

      if (viewType === 'tree') {
        console.log(`📊 Processing as table view for related model: ${resModel}`);

        // Construir dominio basado en el contexto y las opciones de relate
        let domain = [];
        let context = {};

        // Si hay contexto, agregarlo
        if (contextModel && contextId) {
          context = {
            active_id: contextId,
            active_ids: [contextId],
            active_model: contextModel
          };
          console.log(`🔍 Using context:`, context);
        }

        // Evaluar dominio PYSON si está disponible en relateItem
        if (relateItem.pyson_domain) {
          try {
            console.log(`🔍 Evaluating PYSON domain:`, relateItem.pyson_domain);
            
            // Crear contexto temporal para la evaluación
            const tempContext = {
              ...this.context,
              ...context,
              active_id: contextId,
              active_ids: contextId ? [contextId] : [],
              active_model: contextModel
            };
            
            // Guardar contexto original y usar el temporal
            const originalContext = this.context;
            this.context = tempContext;
            
            domain = this.evaluatePysonDomain(relateItem.pyson_domain);
            
            // Restaurar contexto original
            this.context = originalContext;
            
            console.log(`✅ Evaluated domain:`, domain);
          } catch (domainError) {
            console.warn(`⚠️ Error evaluating PYSON domain:`, domainError.message);
            // Usar dominio por defecto si falla la evaluación
            if (contextModel && contextId) {
              domain = [['resource', '=', [contextModel, contextId]]];
            }
          }
        } else if (contextModel && contextId) {
          // Crear dominio por defecto para filtrar registros relacionados
          domain = [['resource', '=', [contextModel, contextId]]];
          console.log(`🔍 Using default context domain:`, domain);
        }

        // Obtener datos para tabla
        const searchParams = [domain, 0, 100, null, context];
        const ids = await this.makeRpcCall(`model.${resModel}.search`, searchParams);

        console.log(`📊 Found ${ids.length} related records`);

        if (ids.length > 0) {
          const fields = Object.keys(fieldsView.fields || {});
          const expandedFields = this.expandFieldsForRelations(fields, resModel);
          const data = await this.makeRpcCall(`model.${resModel}.read`, [ids, expandedFields, {}]);

          tableData = {
            fieldsView,
            data,
            model: resModel,
            viewId: viewId,
            viewType: viewType,
            fields: expandedFields,
            contextModel: contextModel,
            contextId: contextId
          };

          console.log(`✅ Related table data prepared: ${data.length} records`);
        } else {
          // Tabla vacía pero con estructura
          tableData = {
            fieldsView,
            data: [],
            model: resModel,
            viewId: viewId,
            viewType: viewType,
            fields: Object.keys(fieldsView.fields || {}),
            contextModel: contextModel,
            contextId: contextId
          };
          console.log(`📊 Empty related table prepared`);
        }

      } else if (viewType === 'form') {
        console.log(`📝 Processing as form view for related model: ${resModel}`);

        // Para formularios relacionados, crear un formulario vacío
        formData = {
          model: resModel,
          viewId: viewId,
          viewType: 'form',
          fieldsView: fieldsView,
          recordData: null, // Formulario vacío
          contextModel: contextModel,
          contextId: contextId
        };

        console.log(`✅ Related form prepared`);
      }

      return {
        success: true,
        actionName: actionName,
        resModel: resModel,
        toolbarInfo: toolbarInfo,
        viewType: viewType,
        viewId: viewId,
        tableData: tableData,
        formData: formData,
        contextModel: contextModel,
        contextId: contextId
      };

    } catch (error) {
      console.error('Error handling relate action:', error);
      throw error;
    }
  }

}

export default new TrytonService();

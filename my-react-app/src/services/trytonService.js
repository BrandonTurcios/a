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
      
      await this.makeRpcCall('common.db.logout', []);
      
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
              menuItems = menuDetails.map(menu => {
                const finalName = menu.name || menu.rec_name || `Menú ${menu.id}`;
                return {
                  id: menu.id,
                  name: finalName,
                  icon: menu.icon || '📋',
                  iconName: menu['icon:string'] || menu.icon || 'tryton-list',
                  model: menu.model || '',
                  description: menu.description || menu.name || menu.rec_name || `Menú ${menu.id}`,
                  sequence: menu.sequence || 0,
                  childs: menu.childs || []
                };
              });
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
                  menuItems.push({
                    id: menu.id,
                    name: menu.name || iconName || `Menú ${menu.id}`,
                    icon: menu.id || '📋', // Usar el ID del menú como icono
                    iconName: iconName,
                    model: menu.model || '',
                    description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                    sequence: menu.sequence || 0,
                    childs: menu.childs || []
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
            console.error('💥 Error en método alternativo:', fallbackError.message);
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
              menuItems = menuDetails.map(menu => {
                const finalName = menu.name || menu.rec_name || `Menú ${menu.id}`;
                return {
                  id: menu.id,
                  name: finalName,
                  icon: menu.icon || '📋',
                  iconName: menu['icon:string'] || menu.icon || 'tryton-list',
                  model: menu.model || '',
                  description: menu.description || menu.name || menu.rec_name || `Menú ${menu.id}`,
                  sequence: menu.sequence || 0,
                  childs: menu.childs || []
                };
              });
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
              menuItems = menuDetails.map(menu => {
                const finalName = menu.name || menu.rec_name || `Menú ${menu.id}`;
                return {
                  id: menu.id,
                  name: finalName,
                  icon: menu.icon || '📋',
                  iconName: menu['icon:string'] || menu.icon || 'tryton-list',
                  model: menu.model || '',
                  description: menu.description || menu.name || menu.rec_name || `Menú ${menu.id}`,
                  sequence: menu.sequence || 0,
                  childs: menu.childs || []
                };
              });
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
                    menuItems.push({
                      id: menu.id,
                      name: menu.name || iconName || `Menú ${menu.id}`,
                      icon: menu.id || '📋', // Usar el ID del menú como icono
                      iconName: iconName,
                      model: menu.model || '',
                      description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                      sequence: menu.sequence || 0,
                      childs: menu.childs || []
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

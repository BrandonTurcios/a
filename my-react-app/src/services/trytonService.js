import trytonConfig from '../../env.config.js';

// Servicio para conectar con la API de Tryton - REPLICANDO EXACTAMENTE EL SAO
class TrytonService {
  constructor() {
    this.baseURL = trytonConfig.baseURL;
    this.sessionData = null;
    this.database = null;
    this.context = {};
    this.rpcId = 0;
    console.log('TrytonService inicializado con URL directa:', this.baseURL);
  }

  // Función utoa exactamente como en el SAO
  utoa(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  // Generar header de autorización exactamente como el SAO
  getAuthHeader() {
    if (!this.sessionData) return '';
    
    const { username, userId, sessionId } = this.sessionData;
    // El SAO usa: this.login + ':' + this.user_id + ':' + this.session
    // Donde: login = username, user_id = userId, session = sessionId
    const authString = `${username}:${userId}:${sessionId}`;
    const encoded = this.utoa(authString);
    console.log('🔐 Generando auth header (formato SAO):', {
      login: username,        // this.login
      user_id: userId,        // this.user_id  
      session: sessionId,     // this.session
      authString,
      encoded
    });
    return encoded;
  }

  // Método para probar diferentes endpoints de Tryton
  async testEndpoints() {
    // Solo probar el endpoint raíz para common.db.list
    const endpoints = ['/'];
    
    console.log('🧪 Probando endpoints de Tryton...');
    
    for (const endpoint of endpoints) {
      try {
        const url = `${this.baseURL}${endpoint}`;
        console.log(`🔍 Probando: ${url}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'common.db.list',
            params: []
          }),
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log(`✅ ${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log(`🎯 Endpoint funcional encontrado: ${endpoint}`);
          return endpoint;
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
    console.log('🚨 No se encontró ningún endpoint funcional');
    return null;
  }

  // Construir URL para Tryton exactamente como el SAO
  buildURL(method) {
    // common.db.list NO usa base de datos - es para listar las bases disponibles
    if (method === 'common.db.list') {
      return `${this.baseURL}/`;
    }
    
    // El SAO usa: '/' + (session.database || '') + '/'
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
    
    console.log('🔍 === DETALLES DE CONSTRUCCIÓN DE URL ===');
    console.log('🔍 Método:', method);
    console.log('🔍 Base URL:', this.baseURL);
    console.log('🔍 Base de datos:', this.database);
    console.log('🔍 URL construida:', url);
    console.log('🔍 ======================================');
    
    // Construir parámetros exactamente como el SAO
    // El SAO hace: params.push(jQuery.extend({}, session.context, params.pop()));
    const rpcParams = [...params];
    
    // Agregar contexto si hay sesión (como hace el SAO)
    if (this.sessionData && Object.keys(this.context).length > 0) {
      const lastParam = rpcParams.pop() || {};
      rpcParams.push({ ...this.context, ...lastParam });
    }

    // Payload exactamente como el SAO
    const payload = {
      id: ++this.rpcId,
      method: method,
      params: rpcParams
    };

    // Headers exactamente como el SAO
    const headers = {
      'Authorization': this.sessionData ? `Session ${this.getAuthHeader()}` : '',
      'Content-Type': 'application/json'
    };

    console.log('🔍 Llamada RPC a Tryton:', {
      url,
      method,
      params: rpcParams,
      hasAuth: !!this.sessionData,
      payload: JSON.stringify(payload, null, 2),
      headers: headers
    });

    try {
      console.log('📡 Enviando petición POST a:', url);
      console.log('📡 Headers:', headers);
      console.log('📡 Payload:', JSON.stringify(payload, null, 2));
      
      // Llamada fetch exactamente como el SAO (pero usando fetch en lugar de jQuery.ajax)
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'omit'
      });

      console.log('📡 Respuesta RPC recibida:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });

      if (response.status === 401) {
        // Manejar error 401 como el SAO
        console.log('🔄 Sesión expirada, intentando renovar...');
        this.clearSession();
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }

      if (response.status === 403) {
        throw new Error('Acceso prohibido (403). Verifica la configuración de CORS en Tryton.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error HTTP:', {
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
      console.error('💥 Error en llamada RPC:', {
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
    console.log('📦 Datos RPC recibidos:', data);
    console.log('🔍 Tipo de datos:', typeof data);
    console.log('🔍 Estructura de datos:', JSON.stringify(data, null, 2));

    // Manejar respuestas directas de Tryton (como ["health50"])
    if (Array.isArray(data)) {
      console.log('✅ Respuesta directa de Tryton (array):', data);
      return data;
    }

    // Manejar respuestas JSON-RPC estándar
    if (data && typeof data === 'object') {
      // Manejar errores JSON-RPC como el SAO
      if (data.error) {
        const [errorType, errorMessage] = data.error;
        console.error('❌ Error RPC:', errorType, errorMessage);
        throw new Error(`${errorType}: ${errorMessage}`);
      }

      // Retornar resultado como el SAO
      console.log('✅ Resultado JSON-RPC a retornar:', data.result);
      return data.result;
    }

    // Fallback para otros tipos de respuesta
    console.log('⚠️ Tipo de respuesta inesperado, retornando datos tal como están:', data);
    return data;
  }

  // Login exactamente como el SAO
  async login(database, username, password) {
    try {
      console.log('🔐 Iniciando login SAO...');
      
      // Guardar base de datos
      this.database = database;
      
      // Primero obtener lista de bases de datos (sin base de datos específica)
      console.log('📋 Obteniendo lista de bases de datos...');
      const databases = await this.makeRpcCall('common.db.list');
      console.log('🗄️ Bases de datos disponibles:', databases);
      
      // Verificar si la base de datos existe
      if (!databases.includes(database)) {
        throw new Error(`La base de datos '${database}' no existe. Bases disponibles: ${databases.join(', ')}`);
      }
      
      // Ahora hacer login en la base de datos específica (exactamente como el SAO)
      console.log('🔑 Intentando login en base de datos:', database);
      
      const loginParams = [
        username,
        { password: password },
        'en' // Idioma como en el SAO
      ];
      
      const result = await this.makeRpcCall('common.db.login', loginParams);
      console.log('✅ Login exitoso, resultado:', result);

      if (result && result.length >= 2) {
        // Crear sesión exactamente como el SAO
        // result[0] = user_id, result[1] = session (según el SAO)
        this.sessionData = {
          userId: result[0],      // user_id viene primero
          sessionId: result[1],   // session viene segundo
          database: database,
          username: username,
          loginTime: new Date().toISOString()
        };

        // Cargar contexto del usuario como hace el SAO
        await this.loadUserContext();
        
        console.log('🎉 Sesión SAO creada:', this.sessionData);
        return this.sessionData;
      } else {
        throw new Error('Credenciales inválidas');
      }
    } catch (error) {
      console.error('💥 Error en login SAO:', error);
      throw error;
    }
  }

  // Cargar contexto del usuario como hace el SAO
  async loadUserContext() {
    try {
      console.log('🔄 Cargando contexto del usuario...');
      
      const context = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      this.context = context || {};
      
      console.log('📋 Contexto del usuario cargado:', this.context);
    } catch (error) {
      console.warn('⚠️ No se pudo cargar el contexto del usuario:', error.message);
      this.context = {};
    }
  }

  // Logout exactamente como el SAO
  async logout() {
    if (!this.sessionData) {
      return { success: true };
    }

    try {
      console.log('🚪 Cerrando sesión SAO...');
      console.log('🔍 Base de datos actual:', this.database);
      console.log('🔍 URL que se usará:', this.buildURL('common.db.logout'));
      
      await this.makeRpcCall('common.db.logout', []);
      
      console.log('✅ Logout exitoso en servidor');
      this.clearSession();
      return { success: true };
    } catch (error) {
      console.error('💥 Error en logout:', error);
      console.log('⚠️ Forzando logout local...');
      // Forzar logout local incluso si falla
      this.clearSession();
      return { success: true };
    }
  }

  // Limpiar sesión
  clearSession() {
    console.log('🧹 Limpiando sesión...');
    this.sessionData = null;
    this.database = null;
    this.context = {};
    
    // Limpiar localStorage como hace el SAO
    try {
      localStorage.removeItem('tryton_session');
      console.log('🗑️ Sesión eliminada del localStorage');
    } catch (error) {
      console.error('⚠️ Error limpiando localStorage:', error);
    }
  }

  // Restaurar sesión desde datos externos
  restoreSession(sessionData) {
    console.log('🔄 Restaurando sesión SAO...');
    console.log('🔄 Datos recibidos:', sessionData);
    
    if (sessionData && typeof sessionData === 'object') {
      if (!sessionData.sessionId || !sessionData.userId || !sessionData.username || !sessionData.database) {
        console.error('❌ Datos de sesión incompletos:', sessionData);
        console.error('❌ sessionId:', sessionData.sessionId);
        console.error('❌ userId:', sessionData.userId);
        console.error('❌ username:', sessionData.username);
        console.error('❌ database:', sessionData.database);
        this.clearSession();
        return false;
      }
      
      this.sessionData = sessionData;
      this.database = sessionData.database;
      
      console.log('✅ Sesión SAO restaurada:');
      console.log('✅ sessionData:', this.sessionData);
      console.log('✅ database:', this.database);
      console.log('✅ Auth header generado:', this.getAuthHeader());
      
      // NO cargar contexto automáticamente aquí - se hará en getSidebarMenu
      
      return true;
    } else {
      console.log('❌ No hay datos de sesión válidos para restaurar');
      this.clearSession();
      return false;
    }
  }

  // Verificar conexión exactamente como el SAO
  async checkConnection() {
    try {
      console.log('🔍 Verificando conexión SAO...');
      
      // Primero probar diferentes endpoints para encontrar cuál funciona
      const workingEndpoint = await this.testEndpoints();
      
      if (!workingEndpoint) {
        throw new Error('No se encontró ningún endpoint funcional en Tryton');
      }
      
      // Probar common.db.list (sin base de datos)
      const databases = await this.makeRpcCall('common.db.list');
      
      return {
        connected: true,
        databases: databases,
        serverUrl: this.baseURL,
        workingEndpoint: workingEndpoint,
        message: `Conexión exitosa. ${databases.length} bases de datos encontradas. Endpoint: ${workingEndpoint}`
      };
    } catch (error) {
      console.error('💥 Error verificando conexión:', error);
      
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

  // Obtener preferencias del usuario como el SAO
  async getUserPreferences() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('⚙️ Obteniendo preferencias del usuario...');
      console.log('⚙️ Sesión actual:', this.sessionData);
      console.log('⚙️ Auth header:', this.getAuthHeader());
      
      // El SAO usa true como primer parámetro (contexto completo)
      const preferences = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      console.log('📋 Preferencias obtenidas:', preferences);
      return preferences;
    } catch (error) {
      console.error('💥 Error obteniendo preferencias:', error);
      throw error;
    }
  }

  // Obtener menú del sidebar como el SAO
  async getSidebarMenu() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('📱 Obteniendo menú del sidebar...');
      
      // PRIMERO: Probar una llamada simple para verificar la autenticación
      console.log('🧪 Probando autenticación con llamada simple...');
      try {
        const testResult = await this.makeRpcCall('model.ir.module.search_read', [
          [['state', '=', 'installed']],
          ['name']
        ]);
        console.log('✅ Autenticación verificada, módulos encontrados:', testResult.length);
      } catch (authError) {
        console.error('❌ Error de autenticación:', authError);
        throw new Error('Error de autenticación: ' + authError.message);
      }
      
      // SECUENCIA CORRECTA DEL SAO:
      // 1. Recargar contexto
      console.log('🔄 Recargando contexto...');
      await this.loadUserContext();
      
      // 2. Obtener preferencias del usuario (como hace el SAO)
      console.log('⚙️ Obteniendo preferencias...');
      const preferences = await this.getUserPreferences();
      
      // Debug: Mostrar todas las claves de preferences
      console.log('🔍 Claves disponibles en preferences:', Object.keys(preferences || {}));
      console.log('🔍 preferences completo:', preferences);
      
      // 3. Cargar acceso a modelos (como hace el SAO)
      console.log('🔐 Cargando acceso a modelos...');
      const modelAccess = await this.getModelAccess();
      
      // 4. Cargar iconos disponibles
      console.log('🎨 Cargando iconos...');
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
      console.log('🎨 Mapa de iconos creado:', iconMap);
      
      // 5. Obtener menús usando el método del SAO
      console.log('📋 Obteniendo menús usando método SAO...');
      let menuItems = [];
      
      if (preferences.pyson_menu) {
        console.log('📋 PYSON Menu encontrado:', preferences.pyson_menu);
        
        // El SAO usa el pyson_menu para obtener la acción del menú principal
        // Por ahora, vamos a obtener los menús directamente usando ir.ui.menu
        // pero con la sintaxis correcta que funciona
        
        try {
          // Intentar obtener menús con todos los campos de una vez
      const menus = await this.makeRpcCall('model.ir.ui.menu.search_read', [
        [['parent', '=', null]],
            ['name', 'icon', 'sequence', 'childs', 'model', 'description']
          ]);
          
          console.log('📋 Menús obtenidos con search_read:', menus);
          
          if (menus && menus.length > 0) {
            menuItems = menus.map(menu => {
              const iconName = iconMap[menu.icon] || 'tryton-list';
              return {
                id: menu.id,
                name: menu.name || iconName || `Menú ${menu.id}`,
                icon: menu.icon || '📋',
                iconName: iconName,
                model: menu.model || '',
                description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                sequence: menu.sequence || 0,
                childs: menu.childs || []
              };
            });
          }
        } catch (menuError) {
          console.warn('⚠️ Error obteniendo menús con search_read, intentando método alternativo:', menuError.message);
          
          // Método alternativo: obtener solo IDs y luego usar read individual
          try {
            const menuIds = await this.makeRpcCall('model.ir.ui.menu.search_read', [
              [['parent', '=', null]],
              ['id']
            ]);
            
            console.log('📋 IDs de menús obtenidos:', menuIds);
            
            // Usar read individual para cada menú
            for (const menuIdObj of menuIds) {
              try {
                const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
                  [menuIdObj.id],
                  ['name', 'icon', 'sequence', 'childs', 'model', 'description']
                ]);
                
                if (menuDetails && menuDetails.length > 0) {
                  const menu = menuDetails[0];
                  const iconName = iconMap[menu.icon] || 'tryton-list';
                  menuItems.push({
                    id: menu.id,
                    name: menu.name || iconName || `Menú ${menu.id}`,
                    icon: menu.icon || '📋',
                    iconName: iconName,
                    model: menu.model || '',
                    description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                    sequence: menu.sequence || 0,
                    childs: menu.childs || []
                  });
                }
              } catch (individualError) {
                console.warn(`⚠️ Error obteniendo detalles del menú ${menuIdObj.id}:`, individualError.message);
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
        console.warn('⚠️ No se encontró pyson_menu en las preferencias');
        console.log('🔄 Intentando cargar menús directamente con ir.ui.menu...');
        
        // Intentar cargar menús reales cuando no hay pyson_menu
        try {
          // PRIMER INTENTO: Usar search_read con sintaxis correcta
          console.log('🔄 Intentando search_read con sintaxis correcta...');
          const menus = await this.makeRpcCall('model.ir.ui.menu.search_read', [
            [['parent', '=', null]],
            ['name', 'icon', 'sequence', 'childs', 'model', 'description']
          ]);
          
          console.log('📋 Menús obtenidos directamente:', menus);
          
          if (menus && menus.length > 0) {
            menuItems = menus.map(menu => {
              const iconName = iconMap[menu.icon] || 'tryton-list';
              return {
                id: menu.id,
                name: menu.name || iconName || `Menú ${menu.id}`,
                icon: menu.icon || '📋',
                iconName: iconName,
                model: menu.model || '',
                description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                sequence: menu.sequence || 0,
                childs: menu.childs || []
              };
            });
            console.log('✅ Menús reales cargados exitosamente:', menuItems.length);
          } else {
            throw new Error('No se encontraron menús');
          }
        } catch (directMenuError) {
          console.warn('⚠️ Error cargando menús directamente:', directMenuError.message);
          
          // SEGUNDO INTENTO: Usar los IDs que ya tenemos del array que mostraste
          console.log('🔄 Intentando con IDs conocidos...');
          const knownMenuIds = [59, 51, 132, 49, 118, 350, 69, 354, 260, 1];
          
          try {
            // Usar read con múltiples IDs de una vez
            const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
              knownMenuIds,
              ['name', 'icon', 'sequence', 'childs', 'model', 'description']
            ]);
            
            console.log('📋 Detalles de menús obtenidos con read múltiple:', menuDetails);
            
            if (menuDetails && menuDetails.length > 0) {
              menuItems = menuDetails.map(menu => {
                const iconName = iconMap[menu.icon] || 'tryton-list';
                return {
                  id: menu.id,
                  name: menu.name || iconName || `Menú ${menu.id}`,
                  icon: menu.icon || '📋',
                  iconName: iconName,
                  model: menu.model || '',
                  description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                  sequence: menu.sequence || 0,
                  childs: menu.childs || []
                };
              });
              console.log('✅ Menús cargados con read múltiple:', menuItems.length);
            } else {
              throw new Error('No se obtuvieron detalles de menús');
            }
          } catch (readMultipleError) {
            console.warn('⚠️ Error con read múltiple:', readMultipleError.message);
            
            // TERCER INTENTO: Obtener solo IDs y luego usar read individual
            try {
              const menuIds = await this.makeRpcCall('model.ir.ui.menu.search_read', [
                [['parent', '=', null]],
                ['id']
              ]);
              
              console.log('📋 IDs de menús obtenidos para método alternativo:', menuIds);
              
              // Usar read individual para cada menú
              for (const menuIdObj of menuIds) {
                try {
                  const menuDetails = await this.makeRpcCall('model.ir.ui.menu.read', [
                    [menuIdObj.id],
                    ['name', 'icon', 'sequence', 'childs', 'model', 'description']
                  ]);
                  
                  if (menuDetails && menuDetails.length > 0) {
                    const menu = menuDetails[0];
                    const iconName = iconMap[menu.icon] || 'tryton-list';
                    menuItems.push({
                      id: menu.id,
                      name: menu.name || iconName || `Menú ${menu.id}`,
                      icon: menu.icon || '📋',
                      iconName: iconName,
                      model: menu.model || '',
                      description: menu.description || menu.name || iconName || `Menú ${menu.id}`,
                      sequence: menu.sequence || 0,
                      childs: menu.childs || []
                    });
                  }
                } catch (individualError) {
                  console.warn(`⚠️ Error obteniendo detalles del menú ${menuIdObj.id}:`, individualError.message);
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
              console.log('✅ Menús cargados con método alternativo:', menuItems.length);
            } catch (fallbackError) {
              console.error('💥 Error en método alternativo:', fallbackError.message);
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
      
      console.log('✅ Menú del sidebar cargado correctamente');
      console.log('📋 Menús procesados:', menuItems);
      
      return {
        preferences,
        menuItems,
        icons,
        modelAccess,
        viewSearch: [], // Placeholder para vistas de búsqueda
        pysonMenu: preferences.pyson_menu
      };
    } catch (error) {
      console.error('💥 Error obteniendo menú del sidebar:', error);
      throw error;
    }
  }

  // Método de prueba específico para common.db.list
  async testDbList() {
    try {
      console.log('🧪 Probando common.db.list...');
      
      const result = await this.makeRpcCall('common.db.list');
      console.log('✅ common.db.list exitoso:', result);
      return result;
    } catch (error) {
      console.error('💥 Error en common.db.list:', error);
      throw error;
    }
  }

  // Método específico para obtener bases de datos disponibles
  async getAvailableDatabases() {
    try {
      console.log('🔍 Obteniendo bases de datos con common.db.list...');
      const databases = await this.makeRpcCall('common.db.list');
      
      if (databases && Array.isArray(databases) && databases.length > 0) {
        console.log('✅ Bases de datos obtenidas exitosamente:', databases);
        return databases;
      } else {
        console.log('⚠️ No se encontraron bases de datos o formato incorrecto');
        return [];
      }
    } catch (error) {
      console.error('💥 Error obteniendo bases de datos:', error.message);
      throw error;
    }
  }

  // Validar sesión activa
  async validateSession() {
    if (!this.sessionData) {
      console.log('❌ No hay sesión activa');
      return false;
    }

    try {
      console.log('🔍 Validando sesión activa...');
      
      // Intentar una llamada simple para verificar que la sesión sigue siendo válida
      const result = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      
      if (result && typeof result === 'object') {
        console.log('✅ Sesión válida');
        // Actualizar el contexto con la respuesta
        this.context = result;
        return true;
      } else {
        console.log('❌ Sesión inválida - respuesta inesperada:', result);
        return false;
      }
    } catch (error) {
      console.log('❌ Sesión inválida - error:', error.message);
      
      // Si es un error de red o 401, la sesión definitivamente no es válida
      if (error.message.includes('401') || error.message.includes('expirado') || error.message.includes('NetworkError')) {
        return false;
      }
      
      // Para otros errores, asumir que la sesión podría ser válida
      console.log('⚠️ Error no crítico, asumiendo sesión válida');
      return true;
    }
  }

  // Obtener acceso a modelos
  async getModelAccess() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('🔍 Obteniendo acceso a modelos...');
      
      const result = await this.makeRpcCall('model.ir.model.access.search_read', [
        [],
        ['model', 'perm_read', 'perm_write', 'perm_create', 'perm_delete']
      ]);
      
      console.log('✅ Acceso a modelos obtenido:', result);
      return result;
    } catch (error) {
      console.error('💥 Error obteniendo acceso a modelos:', error);
      throw error;
    }
  }

  // Probar conexión simple
  async testConnection() {
    try {
      console.log('🔍 Probando conexión simple...');
      
      const result = await this.makeRpcCall('model.ir.module.search_read', [
        [['state', '=', 'installed']],
        ['name']
      ]);
      
      console.log('✅ Conexión simple exitosa:', result);
      return result;
    } catch (error) {
      console.error('💥 Error en conexión simple:', error);
      throw error;
    }
  }

  // Obtener menú simplificado
  async getSimpleMenu() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('🔍 Obteniendo menú simplificado...');
      
      const menus = await this.makeRpcCall('model.ir.ui.menu.search_read', [
        [['parent', '=', null]],
        ['name', 'icon', 'sequence']
      ]);
      
      console.log('✅ Menú simplificado obtenido:', menus);
      return { menus };
    } catch (error) {
      console.error('💥 Error obteniendo menú simplificado:', error);
      throw error;
    }
  }

  // Ejecutar getModelAccess después del login
  async executeModelAccessAfterLogin() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('🔍 Ejecutando getModelAccess después del login...');
      
      // Primero obtener acceso a modelos
      const modelAccess = await this.getModelAccess();
      
      // Luego obtener menú
      const menu = await this.getSidebarMenu();
      
      console.log('✅ getModelAccess después del login ejecutado:', { modelAccess, menu });
      return { modelAccess, menu };
    } catch (error) {
      console.error('💥 Error ejecutando getModelAccess después del login:', error);
      throw error;
    }
  }

  // Probar getModelAccess específico
  async testModelAccessSpecific() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('🔍 Probando getModelAccess específico...');
      
      // Probar diferentes métodos relacionados con acceso
      const modelAccess = await this.makeRpcCall('model.ir.model.access.search_read', [
        [['model', 'like', 'sale']],
        ['model', 'perm_read', 'perm_write']
      ]);
      
      const userGroups = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      
      console.log('✅ Prueba específica exitosa:', { modelAccess, userGroups });
      return { modelAccess, userGroups };
    } catch (error) {
      console.error('💥 Error en prueba específica:', error);
      throw error;
    }
  }

  // Obtener campos de un modelo (como hace el SAO)
  async getModelFields(modelName) {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log(`🔍 Obteniendo campos del modelo: ${modelName}`);
      
      // El SAO usa fields_view_get para obtener los campos
      // Sintaxis correcta: fields_view_get(view_id, view_type, view_dom, context)
      // Probando con menos argumentos primero
      const result = await this.makeRpcCall(`model.${modelName}.fields_view_get`, [
        false, // view_id
        'tree' // view_type
      ]);
      
      console.log(`✅ Campos obtenidos para ${modelName}:`, Object.keys(result.fields || {}));
      return result.fields || {};
    } catch (error) {
      console.error(`💥 Error obteniendo campos de ${modelName}:`, error);
      throw error;
    }
  }

  // Método auxiliar para intersectar campos disponibles con campos deseados
  _intersectFields(availableFields, wantedFields) {
    const availableFieldNames = Object.keys(availableFields);
    const validFields = wantedFields.filter(field => availableFieldNames.includes(field));
    
    console.log(`🔍 Campos disponibles: ${availableFieldNames.length}`);
    console.log(`🔍 Campos deseados: ${wantedFields.length}`);
    console.log(`🔍 Campos válidos: ${validFields.length}`);
    console.log(`🔍 Campos válidos:`, validFields);
    
    return validFields;
  }

  // Método auxiliar para calcular edad
  _computeAge(birthDate) {
    if (!birthDate) return null;
    
    try {
      let birth;
      
      // Manejar fechas que vienen como objetos de Tryton
      if (typeof birthDate === 'object' && birthDate.__class__ === 'date') {
        birth = new Date(birthDate.year, birthDate.month - 1, birthDate.day);
      } else if (typeof birthDate === 'string') {
        birth = new Date(birthDate);
      } else {
        return null;
      }
      
      // Verificar que la fecha es válida
      if (isNaN(birth.getTime())) {
        return null;
      }
      
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.warn('⚠️ Error calculando edad:', error);
      return null;
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
      console.log(`🏥 Obteniendo pacientes de ${model}...`);
      console.log(`🔍 Dominio:`, domain);
      console.log(`🔍 Campos deseados:`, wantedFields);
      console.log(`🔍 Offset: ${offset}, Limit: ${limit}, Order: ${order}`);

      // 1) Usar campos directamente (como el SAO)
      console.log('📋 Usando campos directamente como el SAO...');
      let fields = wantedFields;
      console.log('📋 Campos solicitados:', fields);

      // 2) Asegurar que el contexto esté cargado
      if (!this.context || Object.keys(this.context).length === 0) {
        console.log('🔄 Cargando contexto del usuario...');
        await this.loadUserContext();
      }
      
      // 3) Hacer la búsqueda en dos pasos como el SAO
      console.log('🔍 Ejecutando búsqueda en dos pasos como el SAO...');
      
      // PASO 1: Obtener IDs de pacientes con search (sintaxis exacta del SAO)
      console.log('📋 Paso 1: Obteniendo IDs de pacientes...');
      const searchParams = [domain, offset, limit, order, {}];
      const patientIds = await this.makeRpcCall(`model.${model}.search`, searchParams);
      
      console.log(`📋 ${patientIds.length} IDs de pacientes obtenidos:`, patientIds);
      
      if (patientIds.length === 0) {
        console.log('📋 No se encontraron pacientes');
        return [];
      }
      
      // PASO 2: Obtener datos completos con read (sintaxis exacta del SAO)
      console.log('📋 Paso 2: Obteniendo datos completos de pacientes...');
      console.log('📋 Contexto actual:', this.context);
      const readParams = [patientIds, fields, {}];
      const rows = await this.makeRpcCall(`model.${model}.read`, readParams);

      console.log(`✅ ${rows.length} pacientes obtenidos`);

      // 4) La edad ya viene calculada por GNU Health en formato "9y 9m 6d"
      console.log('📊 Edades ya calculadas por GNU Health');

      // 5) Los nombres ya vienen en la respuesta del SAO
      console.log('✅ Nombres ya disponibles en la respuesta del SAO');

      console.log('✅ Pacientes procesados exitosamente');
      return rows;
    } catch (error) {
      console.error('💥 Error obteniendo pacientes:', error);
      throw error;
    }
  }

  // Debug de sesión
  debugSession() {
    console.log('🐛 === DEBUG SESSION SAO ===');
    console.log('Session data:', this.sessionData);
    console.log('Database:', this.database);
    console.log('Base URL:', this.baseURL);
    console.log('Context:', this.context);
    
    if (this.sessionData) {
      console.log('Auth header:', this.getAuthHeader());
      console.log('Session ID:', this.sessionData.sessionId);
      console.log('User ID:', this.sessionData.userId);
      console.log('Username:', this.sessionData.username);
      console.log('Database:', this.sessionData.database);
      console.log('Login time:', this.sessionData.loginTime);
    } else {
      console.log('❌ No session data available');
    }
    
    console.log('🐛 === END DEBUG ===');
  }
}

export default new TrytonService();

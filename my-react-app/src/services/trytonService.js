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
    const authString = `${username}:${userId}:${sessionId}`;
    return this.utoa(authString);
  }

  // Método para probar diferentes endpoints de Tryton
  async testEndpoints() {
    const endpoints = [
      '/',
      '/jsonrpc',
      '/rpc',
      '/api',
      '/tryton',
      '/common/db/list'
    ];
    
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

  // Construir URL para Tryton
  buildURL(method) {
    // Para Tryton, todas las llamadas van al mismo endpoint
    // La base de datos se especifica en los parámetros, no en la URL
    return `${this.baseURL}/`;
  }

  // Método RPC principal simplificado
  async makeRpcCall(method, params = []) {
    const url = this.buildURL(method);
    
    // Construir parámetros exactamente como el SAO
    const rpcParams = [...params];
    
    // Agregar contexto si hay sesión (como hace el SAO)
    if (this.sessionData && Object.keys(this.context).length > 0) {
      rpcParams.push({ ...this.context, ...rpcParams.pop() });
    }

    const payload = {
      jsonrpc: '2.0',
      id: ++this.rpcId,
      method: method,
      params: rpcParams
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Agregar header de autorización si hay sesión (exactamente como el SAO)
    if (this.sessionData) {
      headers['Authorization'] = `Session ${this.getAuthHeader()}`;
    }

    console.log('🔍 Llamada RPC a Tryton:', {
      url,
      method,
      params: rpcParams,
      hasAuth: !!this.sessionData,
      payload: JSON.stringify(payload, null, 2),
      headers: headers
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'omit'
      });

      console.log('📡 Respuesta RPC:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
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
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      return this.processResponse(data);
    } catch (error) {
      // Mejorar el manejo de errores de red
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('🌐 Error de red - Verifica la conectividad:', {
          url,
          method,
          error: error.message,
          suggestions: [
            'Verifica que el servidor Tryton esté ejecutándose en ' + this.baseURL,
            'Comprueba que no haya problemas de CORS',
            'Revisa la consola del navegador para más detalles'
          ]
        });
        throw new Error(`Error de conexión: No se puede conectar con el servidor Tryton en ${this.baseURL}. Verifica que el servidor esté ejecutándose.`);
      }
      
      console.error('💥 Error en llamada RPC:', {
        url,
        method,
        error: error.message,
        fullError: error
      });
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

  // Probar conectividad básica
  async testBasicConnectivity() {
    try {
      console.log('🔍 Probando conectividad básica...');
      
      const response = await fetch(`${this.baseURL}/`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      
      console.log('📡 Respuesta de conectividad:', {
        status: response.status,
        statusText: response.statusText,
        url: `${this.baseURL}/`
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Error de conectividad:', error);
      return false;
    }
  }

  // Login exactamente como el SAO
  async login(database, username, password) {
    try {
      console.log('🔐 Iniciando login SAO...');
      
      // Primero probar conectividad básica
      console.log('🌐 Probando conectividad...');
      const isConnected = await this.testBasicConnectivity();
      if (!isConnected) {
        throw new Error(`No se puede conectar con el servidor Tryton en ${this.baseURL}. Verifica que el servidor esté ejecutándose.`);
      }
      
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
        this.sessionData = {
          sessionId: result[0],
          userId: result[1],
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
      
      await this.makeRpcCall('common.db.logout', []);
      
      this.clearSession();
      return { success: true };
    } catch (error) {
      console.error('💥 Error en logout:', error);
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
    
    if (sessionData && typeof sessionData === 'object') {
      if (!sessionData.sessionId || !sessionData.userId || !sessionData.username || !sessionData.database) {
        console.error('❌ Datos de sesión incompletos:', sessionData);
        this.clearSession();
        return false;
      }
      
      this.sessionData = sessionData;
      this.database = sessionData.database;
      
      // Cargar contexto del usuario
      this.loadUserContext();
      
      console.log('✅ Sesión SAO restaurada:', this.sessionData);
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
      
      // Obtener preferencias del usuario (como el SAO)
      const preferences = await this.getUserPreferences();
      
      // Obtener menús principales
      const menus = await this.makeRpcCall('model.ir.ui.menu.search_read', [
        [['parent', '=', null]],
        ['name', 'icon', 'sequence', 'childs']
      ]);
      
      // Obtener iconos disponibles
      const icons = await this.makeRpcCall('model.ir.ui.icon.list_icons', [{}]);
      
      // Convertir menús a formato esperado por el Dashboard
      const menuItems = menus.map(menu => ({
        id: menu.id,
        name: menu.name,
        icon: menu.icon || '📋',
        model: menu.model || '',
        description: menu.description || menu.name
      }));
      
      return {
        preferences,
        menuItems,
        icons,
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
        return true;
      } else {
        console.log('❌ Sesión inválida - respuesta inesperada');
        return false;
      }
    } catch (error) {
      console.log('❌ Sesión inválida - error:', error.message);
      return false;
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

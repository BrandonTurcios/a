import trytonConfig from '../../env.config.js';

// Servicio para conectar con la API de Tryton - REPLICANDO EXACTAMENTE EL SAO
class TrytonService {
  constructor() {
    this.baseURL = trytonConfig.baseURL;
    this.sessionData = null;
    this.database = null;
    this.context = {};
    this.rpcId = 0;
    console.log('TrytonService inicializado con baseURL:', this.baseURL);
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

  // Construir URL exactamente como el SAO
  buildURL(method) {
    // common.db.list NO usa base de datos - es para listar las bases disponibles
    if (method === 'common.db.list') {
      return `${this.baseURL}/`;
    }
    
    // Si hay base de datos, usar la estructura /database/
    if (this.database && this.database.trim() !== '') {
      return `${this.baseURL}/${this.database}/`;
    }
    
    // Fallback a URL base
    return `${this.baseURL}/`;
  }

  // Método RPC principal replicando exactamente el SAO
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

    console.log('🔍 Llamada RPC SAO:', {
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
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
    } catch (error) {
      console.error('💥 Error en llamada RPC:', {
        url,
        method,
        error: error.message,
        fullError: error
      });
      throw error;
    }
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
      
      // Probar common.db.list (sin base de datos)
      const databases = await this.makeRpcCall('common.db.list');
      
      return {
        connected: true,
        databases: databases,
        serverUrl: this.baseURL,
        message: `Conexión exitosa. ${databases.length} bases de datos encontradas.`
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
          'Verifica la configuración de CORS en Tryton'
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
      
      return {
        preferences,
        menus,
        icons,
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

  // Método específico para obtener bases de datos disponibles (con manejo robusto de errores)
  async getAvailableDatabases() {
    try {
      console.log('🔍 Intentando obtener bases de datos con common.db.list...');
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
      
      // Si falla common.db.list, intentar con una lista predefinida común
      console.log('🔄 Intentando con lista predefinida de bases de datos comunes...');
      const commonDatabases = ['tryton', 'his-50', 'demo', 'test'];
      console.log('📋 Lista predefinida:', commonDatabases);
      
      return commonDatabases;
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

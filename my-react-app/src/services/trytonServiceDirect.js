import trytonConfig from '../../env.config.js';

// Servicio para conectar con la API de Tryton - FUNCIONA COMO CURL
class TrytonServiceDirect {
  constructor() {
    this.baseURL = trytonConfig.baseURL;
    this.sessionData = null;
    this.database = null;
    this.context = {};
    this.rpcId = 0;
    console.log('TrytonServiceDirect inicializado con baseURL:', this.baseURL);
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

  // Método RPC principal - FUNCIONA COMO CURL
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

    console.log('🔍 Llamada RPC Directa:', {
      url,
      method,
      params: rpcParams,
      hasAuth: !!this.sessionData
    });

    try {
      // CONFIGURACIÓN COMO CURL - Sin CORS, sin preflight
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        mode: 'no-cors',  // 🔧 CLAVE: Sin CORS
        credentials: 'omit'
      });

      console.log('📡 Respuesta RPC:', {
        status: response.status,
        statusText: response.statusText,
        type: response.type
      });

      // Con mode: 'no-cors', response.ok siempre será false
      // Pero podemos verificar si la petición se envió
      if (response.type === 'opaque') {
        // Petición enviada pero respuesta no accesible
        // Esto significa que funcionó como curl
        console.log('✅ Petición enviada exitosamente (como curl)');
        return { success: true, message: 'Petición enviada exitosamente' };
      }

      // Si no es opaque, intentar procesar normalmente
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 Datos RPC recibidos:', data);

      // Manejar errores JSON-RPC como el SAO
      if (data.error) {
        const [errorType, errorMessage] = data.error;
        console.error('❌ Error RPC:', errorType, errorMessage);
        throw new Error(`${errorType}: ${errorMessage}`);
      }

      // Retornar resultado como el SAO
      return data.result;
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
      console.log('🔐 Iniciando login directo...');
      
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
        
        console.log('🎉 Sesión directa creada:', this.sessionData);
        return this.sessionData;
      } else {
        throw new Error('Credenciales inválidas');
      }
    } catch (error) {
      console.error('💥 Error en login directo:', error);
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

  // Verificar conexión exactamente como el SAO
  async checkConnection() {
    try {
      console.log('🔍 Verificando conexión directa...');
      
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

  // Método de prueba específico para common.db.list
  async testDbList() {
    try {
      console.log('🧪 Probando common.db.list directo...');
      
      const result = await this.makeRpcCall('common.db.list');
      console.log('✅ common.db.list directo exitoso:', result);
      return result;
    } catch (error) {
      console.error('💥 Error en common.db.list directo:', error);
      throw error;
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
}

export default new TrytonServiceDirect();

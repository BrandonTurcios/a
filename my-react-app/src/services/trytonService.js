import trytonConfig from '../../env.config.js';

// Servicio para conectar con la API de Tryton
class TrytonService {
  constructor() {
    this.baseURL = trytonConfig.baseURL;
    this.sessionData = null;
    this.database = null; // Agregar campo para la base de datos
  }

  // Método para hacer llamadas JSON-RPC a Tryton
  async makeRpcCall(method, params = []) {
    // Construir URL como en el SAO original: /database/
    const url = this.database ? `${this.baseURL}/${this.database}/` : `${this.baseURL}/`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Agregar headers de autorización si hay sesión
    if (this.sessionData) {
      headers['Authorization'] = `Session ${this.getAuthHeader()}`;
    }

    const payload = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: Date.now()
    };

    try {
      console.log(`Intentando conectar a: ${url}`);
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'omit'
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 403) {
        throw new Error('Error 403: Tryton está rechazando las peticiones. Verifica la configuración de CORS en tu archivo trytond.conf');
      }

      if (response.status === 500) {
        // Intentar obtener más detalles del error
        let errorDetails = '';
        try {
          const errorResponse = await response.text();
          errorDetails = errorResponse;
          console.error('Error 500 details:', errorResponse);
        } catch (e) {
          errorDetails = 'No se pudo obtener detalles del error';
        }
        
        throw new Error(`Error 500: Problema interno del servidor Tryton. Detalles: ${errorDetails}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.error) {
        throw new Error(data.error.message || 'Error en la llamada RPC');
      }

      return data.result;
    } catch (error) {
      console.error('Error detallado en llamada RPC:', {
        url,
        method,
        error: error.message,
        fullError: error
      });
      
      // Proporcionar mensajes de error más específicos
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`No se puede conectar al servidor Tryton en ${url}. Verifica que el servidor esté ejecutándose.`);
      }
      
      if (error.message.includes('403')) {
        throw new Error('Error 403: La configuración de CORS en Tryton no está funcionando. Verifica tu archivo trytond.conf y reinicia el servidor.');
      }
      
      if (error.message.includes('500')) {
        throw new Error('Error 500: Problema interno del servidor Tryton. Verifica los logs del servidor para más detalles.');
      }
      
      if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
        throw new Error('Error de CORS. El servidor Tryton no permite peticiones desde este origen. Verifica la configuración de CORS en Tryton.');
      }
      
      throw error;
    }
  }

  // Generar header de autorización (como en el SAO original)
  getAuthHeader() {
    if (!this.sessionData) return '';
    
    const { username, user_id, session_id } = this.sessionData;
    const authString = `${username}:${user_id}:${session_id}`;
    return btoa(unescape(encodeURIComponent(authString)));
  }

  // Login a Tryton usando la API real
  async login(database, username, password) {
    try {
      // Guardar la base de datos para usar en las URLs
      this.database = database;
      
      // Primero obtener la lista de bases de datos disponibles
      const databases = await this.makeRpcCall('common.db.list');
      
      // Verificar si la base de datos existe
      if (!databases.includes(database)) {
        throw new Error(`Base de datos '${database}' no encontrada. Bases disponibles: ${databases.join(', ')}`);
      }

      // Intentar login
      const loginParams = {
        login: username,
        parameters: {
          password: password
        }
      };

      const result = await this.makeRpcCall('common.db.login', [database, loginParams, 'es']);

      if (result && result.length >= 2) {
        this.sessionData = {
          user_id: result[0],
          session_id: result[1],
          database: database,
          username: username
        };

        return this.sessionData;
      } else {
        throw new Error('Credenciales inválidas');
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  // Logout (como en el SAO original)
  async logout() {
    if (!this.sessionData) {
      return { success: true };
    }

    try {
      await this.makeRpcCall('common.db.logout', []);
      this.sessionData = null;
      this.database = null; // Limpiar la base de datos
      return { success: true };
    } catch (error) {
      console.error('Error en logout:', error);
      this.sessionData = null;
      this.database = null; // Limpiar la base de datos
      return { success: true }; // Forzar logout local
    }
  }

  // Obtener datos del dashboard
  async getDashboardData() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      // Obtener preferencias del usuario
      const preferences = await this.makeRpcCall('model.res.user.get_preferences', [true, {}]);
      
      // Obtener datos básicos del sistema
      const context = await this.makeRpcCall('model.res.user.get_context', []);
      
      return {
        preferences,
        context,
        session: this.sessionData
      };
    } catch (error) {
      console.error('Error obteniendo datos del dashboard:', error);
      throw error;
    }
  }

  // Obtener módulos disponibles
  async getAvailableModules() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      // Obtener módulos instalados
      const modules = await this.makeRpcCall('model.ir.module.search_read', [
        [['state', '=', 'installed']],
        ['name', 'display_name', 'description']
      ]);

      return modules.map(module => ({
        id: module.name,
        name: module.display_name || module.name,
        description: module.description || '',
        icon: this.getModuleIcon(module.name),
        enabled: true
      }));
    } catch (error) {
      console.error('Error obteniendo módulos:', error);
      // Retornar módulos básicos si hay error
      return [
        { id: 'sales', name: 'Ventas', icon: '💰', enabled: true },
        { id: 'purchases', name: 'Compras', icon: '🛒', enabled: true },
        { id: 'inventory', name: 'Inventario', icon: '📦', enabled: true },
        { id: 'accounting', name: 'Contabilidad', icon: '📋', enabled: true }
      ];
    }
  }

  // Mapear iconos a módulos
  getModuleIcon(moduleName) {
    const iconMap = {
      'sale': '💰',
      'purchase': '🛒',
      'stock': '📦',
      'account': '📋',
      'hr': '👥',
      'health': '🏥',
      'medical': '💊',
      'nursing': '👩‍⚕️',
      'default': '📊'
    };

    return iconMap[moduleName] || iconMap.default;
  }

  // Verificar conexión al servidor
  async checkConnection() {
    try {
      console.log('Verificando conexión con Tryton...');
      
      // Intentar una llamada simple primero (sin base de datos)
      const databases = await this.makeRpcCall('common.db.list');
      console.log('Bases de datos encontradas:', databases);
      
      return {
        connected: true,
        databases: databases,
        serverUrl: this.baseURL
      };
    } catch (error) {
      console.error('Error verificando conexión:', error);
      return {
        connected: false,
        error: error.message,
        serverUrl: this.baseURL,
        suggestions: this.getConnectionSuggestions(error)
      };
    }
  }

  // Proporcionar sugerencias de solución
  getConnectionSuggestions(error) {
    const suggestions = [];
    
    if (error.message.includes('No se puede conectar')) {
      suggestions.push('Verifica que el servidor Tryton esté ejecutándose');
      suggestions.push('Comprueba que el puerto 8000 esté disponible');
      suggestions.push('Ejecuta: gnuhealth-control start');
    }
    
    if (error.message.includes('403')) {
      suggestions.push('🔧 **PROBLEMA DE CONFIGURACIÓN CORS:**');
      suggestions.push('1. Verifica que tu archivo trytond.conf tenga la sección [web_cors]:');
      suggestions.push('   [web_cors]');
      suggestions.push('   enabled = True');
      suggestions.push('   origins = *');
      suggestions.push('   methods = GET,POST,PUT,DELETE,OPTIONS');
      suggestions.push('   headers = Content-Type,Authorization');
      suggestions.push('2. Reinicia completamente Tryton después de cambiar la configuración');
      suggestions.push('3. Verifica que no haya errores 403 en los logs del servidor');
    }
    
    if (error.message.includes('500')) {
      suggestions.push('🔧 **PROBLEMA INTERNO DEL SERVIDOR:**');
      suggestions.push('1. Verifica los logs del servidor Tryton para más detalles');
      suggestions.push('2. Comprueba que la base de datos esté funcionando correctamente');
      suggestions.push('3. Verifica que PostgreSQL esté ejecutándose');
      suggestions.push('4. Revisa que el usuario de la base de datos tenga permisos');
      suggestions.push('5. Intenta reiniciar el servidor Tryton');
    }
    
    if (error.message.includes('CORS')) {
      suggestions.push('Verifica que CORS esté habilitado en la configuración de Tryton');
      suggestions.push('Asegúrate de que [web_cors] esté configurado correctamente');
    }
    
    if (error.message.includes('HTTP error')) {
      suggestions.push('El servidor responde pero hay un error en la configuración');
      suggestions.push('Verifica los logs del servidor Tryton');
    }
    
    return suggestions;
  }
}

export default new TrytonService();

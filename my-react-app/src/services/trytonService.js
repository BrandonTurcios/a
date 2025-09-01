import trytonConfig from '../../env.config.js';

// Servicio para conectar con la API de Tryton
class TrytonService {
  constructor() {
    this.baseURL = trytonConfig.baseURL;
    this.sessionData = null;
    this.database = null; // Agregar campo para la base de datos
    console.log('TrytonService inicializado con baseURL:', this.baseURL);
  }

  // Método para hacer llamadas JSON-RPC a Tryton
  async makeRpcCall(method, params = []) {
    // Construir URL correctamente
    let url;
    
    // Solo usar base de datos en métodos que la requieren
    const methodsWithDatabase = ['common.db.login', 'model.res.user.get_preferences', 'model.ir.module.search_read'];
    
    if (this.database && this.database.trim() !== '' && methodsWithDatabase.includes(method)) {
      // Si hay base de datos y el método la requiere, usar la estructura /database/
      url = `${this.baseURL}/${this.database}/`;
    } else {
      // Si no hay base de datos o el método no la requiere, usar solo la URL base
      url = `${this.baseURL}/`;
    }
    
    console.log('Debug info:', {
      baseURL: this.baseURL,
      database: this.database,
      method: method,
      finalURL: url
    });
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Agregar headers de autorización si hay sesión
    if (this.sessionData) {
      const authHeader = `Session ${this.getAuthHeader()}`;
      headers['Authorization'] = authHeader;
      console.log('Headers de autorización agregados:', { Authorization: authHeader });
    } else {
      console.log('No hay sesión activa, no se agregan headers de autorización');
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
      
      // Verificar si es un error JSON-RPC
      if (data.error) {
        throw new Error(data.error.message || 'Error en la llamada RPC');
      }

      // Tryton puede devolver el resultado directamente o dentro de data.result
      if (data.result !== undefined) {
        return data.result;
      } else {
        // Si no hay data.result, asumir que data es el resultado directo
        return data;
      }
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

  // Restaurar sesión desde datos externos
  restoreSession(sessionData) {
    console.log('RestoreSession llamado con:', sessionData);
    
    if (sessionData && typeof sessionData === 'object') {
      this.sessionData = sessionData;
      this.database = sessionData.database;
      console.log('Sesión restaurada en el servicio:', this.sessionData);
      console.log('Base de datos restaurada:', this.database);
      console.log('Verificando datos de sesión:', {
        username: this.sessionData.username,
        userId: this.sessionData.userId,
        sessionId: this.sessionData.sessionId,
        database: this.database
      });
    } else {
      console.log('No hay datos de sesión válidos para restaurar');
      console.log('Tipo de sessionData:', typeof sessionData);
      console.log('Valor de sessionData:', sessionData);
    }
  }

  // Generar header de autorización (como en el SAO original)
  getAuthHeader() {
    if (!this.sessionData) return '';
    
    const { username, userId, sessionId } = this.sessionData;
    console.log('Generando auth header con:', { username, userId, sessionId });
    const authString = `${username}:${userId}:${sessionId}`;
    const encoded = btoa(unescape(encodeURIComponent(authString)));
    console.log('Auth header generado:', encoded);
    return encoded;
  }

  // Login a Tryton usando la API real
  async login(database, username, password) {
    try {
      // Guardar la base de datos para usar en las URLs
      this.database = database;
      
      // Primero obtener la lista de bases de datos disponibles (sin base de datos específica)
      console.log('Obteniendo lista de bases de datos...');
      const databases = await this.makeRpcCall('common.db.list');
      console.log('Bases de datos disponibles:', databases);
      
      // Verificar si la base de datos existe
      if (!databases.includes(database)) {
        throw new Error(`La base de datos '${database}' no existe. Bases disponibles: ${databases.join(', ')}`);
      }
      
      // Ahora hacer login en la base de datos específica
      // El formato correcto para Tryton es: [username, {password}, language]
      console.log('Intentando login con parámetros:', { username, password, language: 'en' });
      
      // Para el login, necesitamos usar la URL con la base de datos
      const loginUrl = `${this.baseURL}/${database}/`;
      console.log('URL de login:', loginUrl);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const loginPayload = {
        jsonrpc: '2.0',
        method: 'common.db.login',
        params: [
          username,
          {
            password: password
          },
          'en'
        ],
        id: Date.now()
      };

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(loginPayload),
        mode: 'cors',
        credentials: 'omit'
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 401) {
        throw new Error('Credenciales incorrectas. Verifica usuario y contraseña.');
      }

      if (!response.ok) {
        throw new Error(`Error en login: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Login response data:', data);
      
      if (data.error) {
        throw new Error(data.error.message || 'Error en el login');
      }

      // Tryton puede devolver el resultado directamente o dentro de data.result
      const result = data.result !== undefined ? data.result : data;
      console.log('Login result:', result);

      if (result && result.length >= 2) {
        // Crear sesión como en el SAO original
        this.sessionData = {
          sessionId: result[0],
          userId: result[1],
          database: database,
          username: username,
          loginTime: new Date().toISOString()
        };

        console.log('Login exitoso, sesión creada:', this.sessionData);
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

  // Obtener preferencias del usuario (como en el SAO)
  async getUserPreferences() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('Obteniendo preferencias del usuario...');
      
      // Crear el contexto completo como lo hace el SAO
      const context = {
        client: this.generateClientId(), // Generar un ID de cliente único
        company: 1, // Por defecto
        company_filter: "one",
        language: "en",
        language_direction: "ltr",
        locale: {
          date: "%m/%d/%Y",
          decimal_point: ".",
          grouping: [3, 3, 0],
          mon_decimal_point: ".",
          mon_grouping: [3, 3, 0],
          mon_thousands_sep: ",",
          n_cs_precedes: true,
          n_sep_by_space: false,
          n_sign_posn: 1,
          negative_sign: "-",
          p_cs_precedes: true,
          p_sep_by_space: false,
          p_sign_posn: 1,
          positive_sign: "",
          thousands_sep: ","
        }
      };
      
      console.log('Contexto enviado:', context);
      
      // El SAO usa true como primer parámetro para obtener el contexto completo
      const preferences = await this.makeRpcCall('model.res.user.get_preferences', [true, context]);
      console.log('Preferencias obtenidas:', preferences);
      return preferences;
    } catch (error) {
      console.error('Error obteniendo preferencias:', error);
      throw error;
    }
  }

  // Generar ID de cliente único (como en el SAO)
  generateClientId() {
    // Generar un UUID v4 simple
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Obtener lista de iconos (como en el SAO)
  async getIcons() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('Obteniendo lista de iconos...');
      
      // Crear el contexto completo como lo hace el SAO
      const context = {
        client: this.generateClientId(),
        company: 1,
        company_filter: "one",
        language: "en",
        language_direction: "ltr",
        locale: {
          date: "%m/%d/%Y",
          decimal_point: ".",
          grouping: [3, 3, 0],
          mon_decimal_point: ".",
          mon_grouping: [3, 3, 0],
          mon_thousands_sep: ",",
          n_cs_precedes: true,
          n_sep_by_space: false,
          n_sign_posn: 1,
          negative_sign: "-",
          p_cs_precedes: true,
          p_sep_by_space: false,
          p_sign_posn: 1,
          positive_sign: "",
          thousands_sep: ","
        }
      };
      
      const icons = await this.makeRpcCall('model.ir.ui.icon.list_icons', [context]);
      console.log('Iconos obtenidos:', icons);
      return icons;
    } catch (error) {
      console.error('Error obteniendo iconos:', error);
      throw error;
    }
  }

  // Obtener vistas de búsqueda (como en el SAO)
  async getViewSearch() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('Obteniendo vistas de búsqueda...');
      
      // Crear el contexto completo como lo hace el SAO
      const context = {
        client: this.generateClientId(),
        company: 1,
        company_filter: "one",
        language: "en",
        language_direction: "ltr",
        locale: {
          date: "%m/%d/%Y",
          decimal_point: ".",
          grouping: [3, 3, 0],
          mon_decimal_point: ".",
          mon_grouping: [3, 3, 0],
          mon_thousands_sep: ",",
          n_cs_precedes: true,
          n_sep_by_space: false,
          n_sign_posn: 1,
          negative_sign: "-",
          p_cs_precedes: true,
          p_sep_by_space: false,
          p_sign_posn: 1,
          positive_sign: "",
          thousands_sep: ","
        }
      };
      
      const viewSearch = await this.makeRpcCall('model.ir.ui.view_search.get', [context]);
      console.log('Vistas de búsqueda obtenidas:', viewSearch);
      return viewSearch;
    } catch (error) {
      console.error('Error obteniendo vistas de búsqueda:', error);
      throw error;
    }
  }

  // Obtener menú del sidebar (como en el SAO)
  async getSidebarMenu() {
    if (!this.sessionData) {
      throw new Error('No hay sesión activa');
    }

    try {
      console.log('Obteniendo menú del sidebar...');
      
      // Obtener las preferencias del usuario (como en el SAO)
      const preferences = await this.getUserPreferences();
      
      // Obtener la lista de iconos (como en el SAO)
      const icons = await this.getIcons();
      
      // Obtener las vistas de búsqueda (como en el SAO)
      const viewSearch = await this.getViewSearch();
      
      // El menú principal está en preferences.pyson_menu
      // Por ahora, vamos a obtener los módulos instalados como alternativa
      const modules = await this.makeRpcCall('model.ir.module.search_read', [
        [['state', '=', 'installed']],
        ['name', 'display_name', 'description', 'icon']
      ]);

      console.log('Módulos encontrados:', modules);

      // Convertir los módulos a formato de menú
      const menuItems = modules.map(module => ({
        id: module.name,
        name: module.display_name || module.name,
        description: module.description || '',
        icon: this.getModuleIcon(module.name),
        model: module.name,
        type: 'module'
      }));

      return {
        preferences,
        icons,
        viewSearch,
        menuItems,
        modules
      };
    } catch (error) {
      console.error('Error obteniendo menú del sidebar:', error);
      throw error;
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
        databases: databases, // databases ya es el array directamente
        serverUrl: this.baseURL
      };
    } catch (error) {
      console.error('Error verificando conexión:', error);
      
      // Si hay error de CORS, intentar con no-cors para verificar que el servidor responde
      try {
        console.log('Intentando verificación alternativa...');
        const response = await fetch(`${this.baseURL}/`, {
          method: 'GET',
          mode: 'no-cors'
        });
        
        return {
          connected: true,
          databases: [],
          serverUrl: this.baseURL,
          warning: 'Servidor responde pero hay problemas de CORS. Verifica la configuración de CORS en Tryton.'
        };
      } catch (corsError) {
        return {
          connected: false,
          error: error.message,
          serverUrl: this.baseURL,
          suggestions: this.getConnectionSuggestions(error)
        };
      }
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

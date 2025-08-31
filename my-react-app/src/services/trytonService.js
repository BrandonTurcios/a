import trytonConfig from '../../env.config.js';

// Servicio para conectar con la API de Tryton
class TrytonService {
  constructor() {
    this.baseURL = trytonConfig.baseURL;
    this.sessionData = null;
  }

  // Método para hacer llamadas JSON-RPC a Tryton
  async makeRpcCall(method, params = []) {
    const url = `${this.baseURL}/`;
    
    const headers = {
      'Content-Type': 'application/json',
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
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Error en la llamada RPC');
      }

      return data.result;
    } catch (error) {
      console.error('Error en llamada RPC:', error);
      throw error;
    }
  }

  // Generar header de autorización
  getAuthHeader() {
    if (!this.sessionData) return '';
    
    const { username, user_id, session_id } = this.sessionData;
    const authString = `${username}:${user_id}:${session_id}`;
    return btoa(unescape(encodeURIComponent(authString)));
  }

  // Login a Tryton usando la API real
  async login(database, username, password) {
    try {
      // Primero obtener la lista de bases de datos disponibles
      const databases = await this.makeRpcCall('common.db.list');
      
      // Verificar si la base de datos existe
      if (!databases.includes(database)) {
        throw new Error(`Base de datos '${database}' no encontrada`);
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

  // Logout
  async logout() {
    if (!this.sessionData) {
      return { success: true };
    }

    try {
      await this.makeRpcCall('common.db.logout', []);
      this.sessionData = null;
      return { success: true };
    } catch (error) {
      console.error('Error en logout:', error);
      this.sessionData = null;
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
      const databases = await this.makeRpcCall('common.db.list');
      return {
        connected: true,
        databases: databases
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

export default new TrytonService();

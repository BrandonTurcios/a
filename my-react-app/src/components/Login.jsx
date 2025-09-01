import { useState, useEffect } from 'react';
import trytonService from '../services/trytonService';
import ConnectionTest from './ConnectionTest';
import ServerStatus from './ServerStatus';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    database: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [databases, setDatabases] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    // Verificar conexión al cargar el componente
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      console.log('Verificando conexión con Tryton...');
      const result = await trytonService.checkConnection();
      setConnectionStatus(result);
      
      if (result.connected && result.databases && result.databases.length > 0) {
        console.log('Bases de datos encontradas:', result.databases);
        setDatabases(result.databases);
      } else if (result.warning) {
        console.log('Advertencia de conexión:', result.warning);
        // Aún así intentar obtener las bases de datos
        try {
          const databases = await trytonService.makeRpcCall('common.db.list');
          if (databases && databases.length > 0) {
            setDatabases(databases);
          }
        } catch (dbError) {
          console.log('No se pudieron obtener las bases de datos:', dbError.message);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setDatabases([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Limpiar error al escribir
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const sessionData = await trytonService.login(
        formData.database,
        formData.username,
        formData.password
      );
      
      onLogin(sessionData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ServerStatus />
        <ConnectionTest />
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-600">
              Conecta con tu servidor Tryton
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de Base de Datos */}
            <div>
              <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-2">
                Base de Datos
              </label>
              {databases.length > 0 ? (
                <div className="space-y-2">
                  <select
                    id="database"
                    name="database"
                    value={formData.database}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white"
                    required
                  >
                    <option value="">Selecciona una base de datos</option>
                    {databases.map((db, index) => (
                      <option key={index} value={db}>
                        {db}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {databases.length} base(s) de datos encontrada(s)
                    </p>
                    <button
                      type="button"
                      onClick={checkConnection}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Actualizar lista
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    id="database"
                    name="database"
                    value={formData.database}
                    onChange={handleInputChange}
                    placeholder="Ej: tryton, his-50, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Cargando bases de datos disponibles...
                    </p>
                    <button
                      type="button"
                      onClick={checkConnection}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Campo de Usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Tu nombre de usuario"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Campo de Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Tu contraseña"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Botón de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ¿Necesitas ayuda? Verifica que el servidor esté ejecutándose y las credenciales sean correctas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

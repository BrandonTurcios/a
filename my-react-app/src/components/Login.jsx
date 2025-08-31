import { useState, useEffect } from 'react';
import trytonService from '../services/trytonService';
import ConnectionTest from './ConnectionTest';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    database: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [databases, setDatabases] = useState([]);

  useEffect(() => {
    // Cargar bases de datos disponibles al montar el componente
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      const result = await trytonService.checkConnection();
      if (result.connected && result.databases) {
        setDatabases(result.databases);
      }
    } catch (error) {
      console.error('Error cargando bases de datos:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      // Guardar en localStorage (similar a Tryton)
      localStorage.setItem('tryton_session', JSON.stringify(sessionData));
      
      onLogin(sessionData);
    } catch (err) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  // Credenciales de ejemplo para facilitar las pruebas
  const demoCredentials = [
    { database: 'demo', username: 'admin', password: 'admin' },
    { database: 'test', username: 'user', password: 'password' },
    { database: 'production', username: 'manager', password: 'manager123' }
  ];

  const fillDemoCredentials = (index) => {
    const cred = demoCredentials[index];
    setFormData({
      database: cred.database,
      username: cred.username,
      password: cred.password
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tryton</h1>
          <p className="text-gray-600">Sistema de Gestión Empresarial</p>
        </div>

        {/* Test de conexión */}
        <ConnectionTest />

        {/* Formulario de login */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Base de Datos */}
            <div>
              <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-2">
                Base de Datos
              </label>
              <select
                id="database"
                name="database"
                value={formData.database}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              >
                <option value="">Seleccionar base de datos</option>
                {databases.map((db, index) => (
                  <option key={index} value={db}>{db}</option>
                ))}
              </select>
            </div>

            {/* Campo Usuario */}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Nombre de usuario"
                required
              />
            </div>

            {/* Campo Contraseña */}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Contraseña"
                required
              />
            </div>

            {/* Credenciales de ejemplo */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">Credenciales de ejemplo:</p>
              <div className="space-y-2">
                {demoCredentials.map((cred, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => fillDemoCredentials(index)}
                    className="w-full text-left text-xs bg-white border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{cred.database}</span> / {cred.username} / {cred.password}
                  </button>
                ))}
              </div>
            </div>

            {/* Mensaje de error */}
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

            {/* Botón de login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Versión 7.0.33 - Sistema de Gestión Empresarial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

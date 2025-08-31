import { useState, useEffect } from 'react';
import trytonService from '../services/trytonService';

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await trytonService.checkConnection();
      setConnectionStatus(result);
      if (result.connected && result.databases) {
        setDatabases(result.databases);
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Estado de Conexión con Tryton
      </h3>
      
      <div className="space-y-4">
        {/* Estado de conexión */}
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            connectionStatus?.connected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm font-medium">
            {connectionStatus?.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {/* Mensaje de error */}
        {connectionStatus?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600">{connectionStatus.error}</p>
            </div>
          </div>
        )}

        {/* Bases de datos disponibles */}
        {databases.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Bases de datos disponibles:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {databases.map((db, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                  <span className="text-sm text-blue-800 font-medium">{db}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón de reconexión */}
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Probando...' : 'Probar Conexión'}
        </button>
      </div>
    </div>
  );
};

export default ConnectionTest;

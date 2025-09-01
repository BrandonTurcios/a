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
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Verificando conexión...</span>
        </div>
      ) : (
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

          {/* URL del servidor */}
          {connectionStatus?.serverUrl && (
            <div className="text-sm text-gray-600">
              Servidor: <span className="font-mono">{connectionStatus.serverUrl}</span>
            </div>
          )}

          {/* Advertencia de CORS */}
          {connectionStatus?.warning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Advertencia</p>
                  <p className="text-sm text-yellow-700 mt-1">{connectionStatus.warning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {connectionStatus?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-red-600 font-medium">{connectionStatus.error}</p>
                  
                  {/* Sugerencias de solución */}
                  {connectionStatus.suggestions && connectionStatus.suggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-red-700 font-medium mb-2">Sugerencias de solución:</p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {connectionStatus.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
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
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Probar Conexión
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;

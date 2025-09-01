import React, { useState } from 'react';
import trytonService from '../services/trytonService';

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus(null);

    try {
      console.log('=== INICIANDO PRUEBA DE CONEXIÓN ===');
      
      // Primero probar la conexión básica
      const status = await trytonService.checkConnection();
      setConnectionStatus(status);
      
      console.log('Estado de conexión:', status);
      
      if (status.connected) {
        // Si la conexión es exitosa, probar específicamente common.db.list
        try {
          console.log('Probando common.db.list específicamente...');
          const databases = await trytonService.testDbList();
          console.log('Bases de datos obtenidas:', databases);
          
          setConnectionStatus(prev => ({
            ...prev,
            databases: databases,
            message: `Conexión exitosa. ${databases.length} bases de datos encontradas.`
          }));
        } catch (dbError) {
          console.error('Error en common.db.list:', dbError);
          setError(`Error obteniendo bases de datos: ${dbError.message}`);
        }
      }
    } catch (err) {
      console.error('Error en prueba de conexión:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setConnectionStatus(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🔧 Prueba de Conexión Tryton
      </h2>
      
      <div className="mb-6">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded mr-4"
        >
          {loading ? 'Probando...' : '🔍 Probar Conexión'}
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          🗑️ Limpiar
        </button>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-800">Probando conexión con Tryton...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-red-800 font-semibold mb-2">❌ Error de Conexión</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {connectionStatus && (
        <div className="space-y-4">
          <div className={`p-4 rounded border ${
            connectionStatus.connected 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              connectionStatus.connected ? 'text-green-800' : 'text-red-800'
            }`}>
              {connectionStatus.connected ? '✅ Conexión Exitosa' : '❌ Conexión Fallida'}
            </h3>
            
            <div className="space-y-2">
              <p><strong>Servidor:</strong> {connectionStatus.serverUrl}</p>
              {connectionStatus.message && (
                <p><strong>Mensaje:</strong> {connectionStatus.message}</p>
              )}
              {connectionStatus.warning && (
                <p className="text-yellow-700"><strong>⚠️ Advertencia:</strong> {connectionStatus.warning}</p>
              )}
            </div>
          </div>

          {connectionStatus.databases && connectionStatus.databases.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="text-blue-800 font-semibold mb-2">🗄️ Bases de Datos Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {connectionStatus.databases.map((db, index) => (
                  <div key={index} className="p-2 bg-blue-100 rounded text-blue-800">
                    {db}
                  </div>
                ))}
              </div>
            </div>
          )}

          {connectionStatus.suggestions && connectionStatus.suggestions.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="text-yellow-800 font-semibold mb-2">💡 Sugerencias de Solución</h3>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                {connectionStatus.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {connectionStatus.debugInfo && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <h3 className="text-gray-800 font-semibold mb-2">🐛 Información de Debug</h3>
              <pre className="text-sm text-gray-700 bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(connectionStatus.debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <h3 className="text-gray-800 font-semibold mb-2">ℹ️ Información de Configuración</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>URL Base:</strong> {trytonService.baseURL}</p>
          <p><strong>Base de Datos:</strong> {trytonService.database || 'No establecida'}</p>
          <p><strong>Sesión Activa:</strong> {trytonService.sessionData ? 'Sí' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;

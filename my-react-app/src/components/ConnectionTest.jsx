import React, { useState } from 'react';
import trytonService from '../services/trytonService';

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testPort, setTestPort] = useState('8000');
  const [customPort, setCustomPort] = useState('');

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus(null);

    try {
      console.log('=== INICIANDO PRUEBA DE CONEXIÓN COMPLETA ===');
      
      // Determinar qué puerto probar
      let portToTest = testPort;
      if (testPort === 'custom' && customPort.trim()) {
        portToTest = customPort.trim();
      }
      
      console.log('🔍 Probando puerto:', portToTest);
      
      // Crear un servicio temporal con el puerto de prueba
      const tempService = {
        baseURL: `http://localhost:${portToTest}`,
        
        // Método principal para probar common.db.list
        async testDbList() {
          try {
            console.log('=== PRUEBA ESPECÍFICA common.db.list ===');
            console.log('Base URL:', this.baseURL);
            
            const url = `${this.baseURL}/`;
            console.log('URL que se usará:', url);
            
            const headers = {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            };

            const payload = {
              jsonrpc: '2.0',
              method: 'common.db.list',
              params: [],
              id: Date.now()
            };

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

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Details: ${errorText}`);
            }

            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.error) {
              throw new Error(data.error.message || 'Error en la llamada RPC');
            }

            const result = data.result !== undefined ? data.result : data;
            console.log('=== PRUEBA common.db.list EXITOSA ===');
            console.log('Resultado:', result);
            return result;
          } catch (error) {
            console.error('=== ERROR EN PRUEBA common.db.list ===');
            console.error('Error:', error);
            throw error;
          }
        },

        // Método para probar diferentes endpoints
        async testMultipleEndpoints() {
          console.log('=== PROBANDO MÚLTIPLES ENDPOINTS ===');
          
          const endpoints = [
            '/',
            '/jsonrpc',
            '/api',
            '/rpc',
            '/tryton'
          ];
          
          const results = {};
          
          for (const endpoint of endpoints) {
            try {
              console.log(`🔍 Probando endpoint: ${endpoint}`);
              
              const url = `${this.baseURL}${endpoint}`;
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'common.db.list',
                  params: [],
                  id: Date.now()
                }),
                mode: 'cors',
                credentials: 'omit'
              });
              
              results[endpoint] = {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
              };
              
              if (response.ok) {
                try {
                  const data = await response.json();
                  results[endpoint].data = data;
                  console.log(`✅ ${endpoint} - EXITOSO:`, data);
                } catch (e) {
                  results[endpoint].parseError = e.message;
                  console.log(`⚠️ ${endpoint} - Error parseando JSON:`, e.message);
                }
              } else {
                console.log(`❌ ${endpoint} - Status ${response.status}: ${response.statusText}`);
              }
            } catch (error) {
              results[endpoint] = {
                error: error.message,
                type: 'Network Error'
              };
              console.log(`❌ ${endpoint} - Error de red:`, error.message);
            }
          }
          
          return results;
        },

        // Método para probar GET (solo para diagnóstico)
        async testGetResponse() {
          try {
            console.log('=== PROBANDO RESPUESTA GET ===');
            
            const response = await fetch(`${this.baseURL}/`, {
              method: 'GET',
              mode: 'cors'
            });
            
            return {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok
            };
          } catch (error) {
            return {
              error: error.message,
              type: 'Network Error'
            };
          }
        }
      };
      
      // === INICIAR PRUEBAS COMPLETAS ===
      
      // 1. Probar GET primero (para ver si el servidor responde)
      console.log('📡 Paso 1: Probando respuesta GET...');
      const getResult = await tempService.testGetResponse();
      console.log('Resultado GET:', getResult);
      
      // 2. Probar múltiples endpoints
      console.log('📡 Paso 2: Probando múltiples endpoints...');
      const endpointResults = await tempService.testMultipleEndpoints();
      console.log('Resultados de endpoints:', endpointResults);
      
      // 3. Probar common.db.list específicamente
      console.log('📡 Paso 3: Probando common.db.list...');
      try {
        const databases = await tempService.testDbList();
        setConnectionStatus({
          connected: true,
          databases: databases,
          serverUrl: tempService.baseURL,
          message: `Conexión exitosa al puerto ${portToTest}. ${databases.length} bases de datos encontradas.`,
          debugInfo: {
            getResult,
            endpointResults,
            workingEndpoint: '/'
          }
        });
      } catch (dbError) {
        console.error('Error en common.db.list:', dbError);
        
        // Buscar un endpoint que funcione
        const workingEndpoint = Object.entries(endpointResults).find(([endpoint, result]) => 
          result.ok && result.data && !result.data.error
        );
        
        if (workingEndpoint) {
          const [endpoint, result] = workingEndpoint;
          setConnectionStatus({
            connected: true,
            databases: result.data.result || result.data,
            serverUrl: tempService.baseURL,
            message: `Conexión exitosa usando endpoint ${endpoint}`,
            warning: `El endpoint raíz (/) no funciona, pero ${endpoint} sí funciona.`,
            debugInfo: {
              getResult,
              endpointResults,
              workingEndpoint: endpoint,
              originalError: dbError.message
            }
          });
        } else {
          // Ningún endpoint funciona
          setConnectionStatus({
            connected: false,
            error: dbError.message,
            serverUrl: tempService.baseURL,
            suggestions: [
              `No se puede conectar al puerto ${portToTest}`,
              'Verifica que el servidor Tryton esté ejecutándose',
              'Comprueba que el puerto esté disponible',
              'Verifica la configuración de CORS en Tryton',
              'Revisa los logs del servidor para más detalles'
            ],
            debugInfo: {
              getResult,
              endpointResults,
              workingEndpoint: null,
              originalError: dbError.message
            }
          });
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

  // Función para probar un puerto específico desde la consola
  const testSpecificPort = async (port) => {
    console.log(`=== PROBANDO PUERTO ${port} DESDE CONSOLA ===`);
    
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'common.db.list',
          params: [],
          id: Date.now()
        })
      });
      
      console.log(`Puerto ${port} - Status:`, response.status);
      console.log(`Puerto ${port} - Headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Puerto ${port} - Data:`, data);
        return { success: true, data };
      } else {
        const errorText = await response.text();
        console.log(`Puerto ${port} - Error:`, errorText);
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error(`Puerto ${port} - Network Error:`, error.message);
      return { success: false, error: error.message };
    }
  };

  // Función para probar múltiples endpoints desde la consola
  const testEndpoints = async (port = '5173') => {
    console.log(`=== PROBANDO ENDPOINTS EN PUERTO ${port} ===`);
    
    const endpoints = ['/', '/jsonrpc', '/api', '/rpc', '/tryton'];
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:${port}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'common.db.list',
            params: [],
            id: Date.now()
          })
        });
        
        results[endpoint] = {
          status: response.status,
          ok: response.ok
        };
        
        if (response.ok) {
          try {
            const data = await response.json();
            results[endpoint].data = data;
            console.log(`✅ ${endpoint}:`, data);
          } catch (e) {
            results[endpoint].parseError = e.message;
          }
        }
      } catch (error) {
        results[endpoint] = { error: error.message };
      }
    }
    
    console.table(results);
    return results;
  };

  // Función para ejecutar todas las pruebas desde consola
  const runConsoleTests = async () => {
    console.log('=== EJECUTANDO TODAS LAS PRUEBAS DESDE CONSOLA ===');
    
    const ports = ['5173', '8000', '3000', '8080'];
    
    for (const port of ports) {
      console.log(`\n🔍 Probando puerto ${port}...`);
      await testSpecificPort(port);
    }
    
    console.log('\n🔍 Probando endpoints en puerto 5173...');
    await testEndpoints('5173');
    
    console.log('\n✅ Pruebas completadas. Revisa los resultados arriba.');
  };

  // Hacer las funciones disponibles globalmente para uso desde consola
  React.useEffect(() => {
    window.testSpecificPort = testSpecificPort;
    window.testEndpoints = testEndpoints;
    window.runConsoleTests = runConsoleTests;
    window.testConnection = testConnection;
    
    console.log('=== FUNCIONES DE DIAGNÓSTICO DISPONIBLES ===');
    console.log('window.testSpecificPort(port) - Prueba un puerto específico');
    console.log('window.testEndpoints(port) - Prueba múltiples endpoints');
    console.log('window.runConsoleTests() - Ejecuta todas las pruebas');
    console.log('window.testConnection() - Ejecuta pruebas del componente');
    
    return () => {
      delete window.testSpecificPort;
      delete window.testEndpoints;
      delete window.runConsoleTests;
      delete window.testConnection;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🔧 Prueba de Conexión Tryton
      </h2>
      
      <div className="mb-6 space-y-4">
        {/* Selector de puerto */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Puerto a probar:</label>
          <select
            value={testPort}
            onChange={(e) => setTestPort(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="8000">8000 (Estándar Tryton)</option>
            <option value="3000">3000 (Alternativo)</option>
            <option value="8080">8080 (Alternativo)</option>
            <option value="5173">5173 (Vite/React)</option>
            <option value="custom">Personalizado</option>
          </select>
          
          {testPort === 'custom' && (
            <input
              type="text"
              value={customPort}
              onChange={(e) => setCustomPort(e.target.value)}
              placeholder="Ej: 9000"
              className="border border-gray-300 rounded px-3 py-2 text-sm w-24"
            />
          )}
        </div>
        
        {/* Botones */}
        <div className="flex space-x-4">
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
          >
            {loading ? 'Probando...' : '🔍 Probar Conexión'}
          </button>
          
          <button
            onClick={clearResults}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            🗑️ Limpiar
          </button>

          <button
            onClick={() => {
              console.log('=== COMANDOS DE DIAGNÓSTICO DISPONIBLES ===');
              console.log('1. testConnection() - Ejecuta todas las pruebas');
              console.log('2. testSpecificPort(port) - Prueba un puerto específico');
              console.log('3. testEndpoints() - Prueba múltiples endpoints');
              console.log('4. runConsoleTests() - Ejecuta pruebas desde consola');
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            📋 Ver Comandos
          </button>
        </div>
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

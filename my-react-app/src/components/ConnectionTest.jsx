import React, { useState } from 'react';
import trytonServiceSAO from '../services/trytonServiceSAO.js';
import { trytonConfig } from '../../env.config.js';

const ConnectionTest = () => {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testDirectConnection = async () => {
    setIsLoading(true);
    setTestResult('Probando conexión directa a Tryton...');
    
    try {
          // Test directo usando fetch a Tryton
    const response = await fetch(`${trytonConfig.baseURL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'common.db.list',
          params: [],
          id: Date.now()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Conexión directa exitosa: ${JSON.stringify(data)}`);
      } else {
        const errorText = await response.text();
        setTestResult(`❌ Error HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      setTestResult(`❌ Error de conexión: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testServiceConnection = async () => {
    setIsLoading(true);
    setTestResult('Probando conexión a través del servicio SAO...');
    
    try {
      const result = await trytonServiceSAO.checkConnection();
      setTestResult(`✅ Servicio SAO funcionando: ${JSON.stringify(result)}`);
    } catch (error) {
      setTestResult(`❌ Error en servicio SAO: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDbList = async () => {
    setIsLoading(true);
    setTestResult('Probando common.db.list con servicio SAO...');
    
    try {
      const result = await trytonServiceSAO.testDbList();
      setTestResult(`✅ common.db.list SAO exitoso: ${JSON.stringify(result)}`);
      } catch (error) {
      setTestResult(`❌ Error en common.db.list SAO: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async () => {
    setIsLoading(true);
    setTestResult('Probando login con servicio SAO...');
    
    try {
      // Usar credenciales de prueba (ajusta según tu configuración)
      const result = await trytonServiceSAO.login('health50', 'admin', 'admin');
      setTestResult(`✅ Login SAO exitoso: ${JSON.stringify(result)}`);
    } catch (error) {
      setTestResult(`❌ Error en login SAO: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">🔧 Prueba de Conexión Tryton (Directa)</h2>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testDirectConnection}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
          >
            Test Conexión Directa
          </button>
          
          <button
            onClick={testServiceConnection}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
          >
            Test Servicio SAO
          </button>
          
          <button
            onClick={testDbList}
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mr-2 disabled:opacity-50"
          >
            Test DB List SAO
          </button>

          <button
            onClick={testLogin}
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Test Login SAO
          </button>
        </div>

        {isLoading && (
          <div className="text-blue-600">🔄 Probando conexión...</div>
        )}

        {testResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Resultado:</h3>
            <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800">ℹ️ Información de Debug SAO:</h3>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>• Base URL configurada: <code>{trytonServiceSAO.baseURL}</code></li>
            <li>• Conexión: <code>Directa (sin proxy)</code></li>
            <li>• Puerto React: <code>5173</code></li>
            <li>• Puerto Tryton: <code>{trytonConfig.baseURL.split(':').pop()}</code></li>
            <li>• Base de datos: <code>{trytonServiceSAO.database || 'No establecida'}</code></li>
            <li>• Sesión activa: <code>{trytonServiceSAO.sessionData ? 'Sí' : 'No'}</code></li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800">🔍 Implementación SAO:</h3>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>• URLs: <code>/</code> para common.db.list, <code>/{trytonServiceSAO.database || 'database'}/</code> para otros métodos</li>
            <li>• Headers: <code>Authorization: Session base64(username:userid:sessionid)</code></li>
            <li>• Contexto: Se incluye automáticamente en cada petición</li>
            <li>• Manejo de errores: 401 para sesión expirada, JSON-RPC para errores de aplicación</li>
              </ul>
        </div>

        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-semibold text-red-800">⚠️ IMPORTANTE:</h3>
          <p className="text-sm text-red-700 mt-2">
            Para que la conexión directa funcione, debes configurar CORS en Tryton. 
            Ejecuta: <code>sudo ./fix_cors_direct.sh</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;

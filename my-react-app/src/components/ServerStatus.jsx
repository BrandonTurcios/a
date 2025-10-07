import { useState, useEffect } from 'react';
import { trytonConfig } from '../../env.config.js';
import trytonService from '../services/trytonService.js';

const ServerStatus = () => {
  const [serverStatus, setServerStatus] = useState({
    tryton: 'checking'
  });
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState('');

  const checkTrytonServer = async () => {
    try {
      console.log('Verificando servidor Tryton...');
      
      // Usar el servicio TrytonService en lugar de peticiones GET directas
      const connectionResult = await trytonService.checkConnection();
      
      if (connectionResult.connected) {
        console.log('Tryton está funcionando correctamente');
        return 'running';
      } else {
        console.error('Tryton no está disponible:', connectionResult.error);
        setErrorDetails(connectionResult.error);
        return 'stopped';
      }
      
    } catch (error) {
      console.error('Tryton check error:', error);
      setErrorDetails(error.message);
      return 'stopped';
    }
  };

  useEffect(() => {
    const checkServers = async () => {
      setLoading(true);
      setErrorDetails('');
      
      // Verificar servidor Tryton directamente
      const trytonStatus = await checkTrytonServer();
      
      setServerStatus({
        tryton: trytonStatus
      });
      
      setLoading(false);
    };

    checkServers();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
      case 'error':
        return 'bg-red-500';
      case 'checking':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'running':
        return 'Ejecutándose';
      case 'stopped':
        return 'Detenido';
      case 'error':
        return 'Error';
      case 'checking':
        return 'Verificando...';
      default:
        return 'Desconocido';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Estado del Servidor
      </h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Verificando servidor...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Servidor Tryton */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(serverStatus.tryton)}`}></div>
              <div>
                <p className="font-medium text-gray-800">Servidor Tryton</p>
                <p className="text-sm text-gray-600">{trytonConfig.baseURL}</p>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {getStatusText(serverStatus.tryton)}
            </span>
          </div>

          {/* Detalles del error */}
          {serverStatus.tryton === 'error' && errorDetails && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-red-800 font-medium">Server Error</p>
                  <p className="text-sm text-red-700 mt-1 font-mono text-xs">
                    {errorDetails}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información de solución */}
          {serverStatus.tryton === 'stopped' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Servidor Tryton no está ejecutándose</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Para solucionarlo, ejecuta: <code className="bg-yellow-100 px-1 rounded">gnuhealth-control start</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {serverStatus.tryton === 'error' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-blue-800 font-medium">Servidor con problemas internos</p>
                  <p className="text-sm text-blue-700 mt-1">
                    El servidor está ejecutándose pero tiene problemas internos. Verifica los logs del servidor Tryton.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botón de recarga */}
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Recargar Estado
          </button>
        </div>
      )}
    </div>
  );
};

export default ServerStatus;

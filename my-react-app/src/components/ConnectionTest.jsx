import { useState } from 'react';
import { trytonConfig } from '../../env.config.js';
import trytonService from '../services/trytonService.js';

const ConnectionTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState('');

  const testDirectConnection = async () => {
    setIsLoading(true);
    setTestResult('Probando conexión a través del servicio TrytonService...');
    
    try {
      const result = await trytonService.checkConnection();
      if (result.connected) {
        setTestResult(`✅ Conexión exitosa: ${result.message}`);
      } else {
        setTestResult(`❌ Conexión falló: ${result.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Error de conexión: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testServiceConnection = async () => {
    setIsLoading(true);
    setTestResult('Probando conexión a través del servicio...');
    
    try {
      const result = await trytonService.checkConnection();
      setTestResult(`✅ Servicio funcionando: ${JSON.stringify(result)}`);
    } catch (error) {
      setTestResult(`❌ Error en servicio: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDbList = async () => {
    setIsLoading(true);
    setTestResult('Probando common.db.list...');
    
    try {
      const result = await trytonService.testDbList();
      setTestResult(`✅ common.db.list exitoso: ${JSON.stringify(result)}`);
    } catch (error) {
      setTestResult(`❌ Error en common.db.list: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async () => {
    setIsLoading(true);
    setTestResult('Probando login...');
    
    try {
      // Usar credenciales de prueba (ajusta según tu configuración)
      const result = await trytonService.login('health50', 'admin', 'admin');
      setTestResult(`✅ Login exitoso: ${JSON.stringify(result)}`);
    } catch (error) {
      setTestResult(`❌ Error en login: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
     
    </div>
  );
};

export default ConnectionTest;

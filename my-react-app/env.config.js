// Configuración de Tryton
export const trytonConfig = {
  // URL base del servidor Tryton (usando proxy de desarrollo)
  baseURL: '/tryton', // Esto usará el proxy configurado en Vite
  
  // URL directa (para referencia)
  directURL: 'http://localhost:8000',
  
  // Configuración de la base de datos
  database: {
    uri: 'postgresql://:5432',
    path: '/opt/gnuhealth/his-50/attach'
  },
  
  // Configuración web
  web: {
    listen: '0.0.0.0:8000',
    root: '/home/gnuhealth/Downloads/a/',
    cors: {
      enabled: true,
      origins: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization']
    }
  },
  
  // Configuración JSON-RPC
  jsonrpc: {
    listen: '0.0.0.0:8000'
  }
};

export default trytonConfig;

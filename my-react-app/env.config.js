// Configuración de Tryton
export const trytonConfig = {
  // URL directa de Tryton
  // En desarrollo, usa el proxy de Vite para evitar CORS
  // En producción, usa la URL completa del servidor
  baseURL: import.meta.env.DEV 
    ? '/api'  // Proxy de Vite en desarrollo
    : 'http://9.234.137.128:8000',  // URL directa en producción
  
  // Configuración adicional
  timeout: 30000, // 30 segundos
  retries: 3,
  // Headers por defecto
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export default trytonConfig;

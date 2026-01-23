// Configuración de Tryton
export const trytonConfig = {
  // URL de Tryton
  // En desarrollo, usa el proxy de Vite para evitar CORS
  // En producción (Vercel), usa el proxy de Vercel (/api)
  // Si tienes HTTPS en el servidor Tryton, puedes usar la URL directa con HTTPS
  baseURL: import.meta.env.DEV 
    ? '/api'  // Proxy de Vite en desarrollo
    : import.meta.env.VITE_TRYTON_URL || '/api',  // Proxy de Vercel o variable de entorno
  
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

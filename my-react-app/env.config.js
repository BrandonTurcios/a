// Configuración de Tryton
export const trytonConfig = {
  // Usar proxy de Vite para evitar problemas de CORS
  baseURL: 'http://localhost:5173/tryton', 
  directURL: 'http://localhost:8000', // URL directa de Tryton (para referencia)
  
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

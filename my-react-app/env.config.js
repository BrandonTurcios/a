// Configuración de Tryton
export const trytonConfig = {
  // Usar directamente la URL de Tryton (sin proxy)
  baseURL: 'http://localhost:8000', 
  directURL: 'http://localhost:8000', // URL directa de Tryton
  
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

// Configuración de Tryton
export const trytonConfig = {
  // URL directa de Tryton
  baseURL: 'http://localhost:8000',
  
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

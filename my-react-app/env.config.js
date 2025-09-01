// Configuración de Tryton
export const trytonConfig = {
  baseURL: 'http://localhost:5173', // URL directa al servidor Tryton
  directURL: 'http://localhost:5173', // Para referencia
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

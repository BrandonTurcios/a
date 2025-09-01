// Configuración de Tryton
export const trytonConfig = {
  // ✅ CONFIGURACIÓN CORREGIDA - Tryton funciona en puerto 5173
  baseURL: 'http://localhost:5173', // Puerto donde está corriendo Tryton
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

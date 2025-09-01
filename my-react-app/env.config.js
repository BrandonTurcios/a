// Configuración de Tryton
export const trytonConfig = {
  // IMPORTANTE: Cambia esto según donde esté corriendo tu servidor Tryton
  baseURL: 'http://localhost:8000', // Puerto estándar de Tryton
  // Si tu servidor Tryton está corriendo en otro puerto, cámbialo aquí
  
  // Alternativas comunes:
  // baseURL: 'http://localhost:8000',  // Puerto estándar de Tryton
  // baseURL: 'http://localhost:3000',  // Puerto alternativo
  // baseURL: 'http://localhost:8080',  // Puerto alternativo
  
  directURL: 'http://localhost:8000', // Para referencia
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

// Configuración de Tryton
export const trytonConfig = {
  // ✅ CONFIGURACIÓN CON PROXY - Usar proxy de Vite para evitar CORS
  baseURL: 'http://localhost:3000/tryton', // Proxy de Vite que redirige a Tryton
  directURL: 'http://localhost:5173', // URL directa a Tryton (para referencia)
  trytonPort: 5173, // Puerto donde está corriendo Tryton
  vitePort: 3000, // Puerto donde corre Vite
  
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

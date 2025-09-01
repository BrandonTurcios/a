import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Cambiar a puerto 3000 para evitar conflicto con Tryton en 5173
    host: true,
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:8000', 'http://localhost:5174'],
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
    },
    proxy: {
      // Configurar proxy para Tryton
      '/tryton': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tryton/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tryton': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tryton/, ''),
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Asegurar que los headers CORS se manejen correctamente
            proxyReq.setHeader('Origin', 'http://localhost:5173');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            // Agregar headers CORS si no están presentes
            if (!proxyRes.headers['access-control-allow-origin']) {
              proxyRes.headers['access-control-allow-origin'] = '*';
            }
            if (!proxyRes.headers['access-control-allow-methods']) {
              proxyRes.headers['access-control-allow-methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
            }
            if (!proxyRes.headers['access-control-allow-headers']) {
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type,Authorization';
            }
          });
        },
      }
    }
  }
})

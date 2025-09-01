import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Cambiar a puerto 3000 para evitar conflicto con Tryton en 5173
    host: true,
    proxy: {
      // NO configurar proxy automático - dejar que la app maneje las llamadas a Tryton
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})

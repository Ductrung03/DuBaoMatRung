import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'leaflet': path.resolve(__dirname, '../node_modules/leaflet')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // ✅ TẤT CẢ /api/* requests đều đi qua Gateway (port 3000)
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Hỗ trợ WebSocket
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  }
})

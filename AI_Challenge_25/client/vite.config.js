// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_URL = process.env.REACT_APP_API_URL || 'http://backend:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})

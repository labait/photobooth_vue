import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
    allowedHosts: [
      'laba-photobooth.netlify.app', 
      'localhost', 
      '127.0.0.1',
      'mbpromag.eu.ngrok.io',
      'laba-photobooth.netlify.app',
    ],
  },
  plugins: [vue()],
})

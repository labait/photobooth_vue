import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  server: {
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

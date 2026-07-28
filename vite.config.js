import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
  plugins: [
    vue(),
    {
      name: 'netlify-spa-redirects',
      closeBundle() {
        writeFileSync(resolve('dist/_redirects'), '/*    /index.html   200\n')
      },
    },
  ],
})

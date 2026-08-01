import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function injectGoogleAnalytics(measurementId) {
  return {
    name: 'inject-google-analytics',
    transformIndexHtml(html) {
      const snippet = `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"><\/script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    <\/script>`
      return html.replace('</head>', `${snippet}\n  </head>`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gaMeasurementId = env.VITE_GA_MEASUREMENT_ID

  return {
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
      'photobooth-laba.netlify.app', 
      'localhost', 
      '127.0.0.1',
      'mbpromag.eu.ngrok.io',
      'photobooth-laba.netlify.app',
    ],
  },
  plugins: [
    vue(),
    ...(gaMeasurementId ? [injectGoogleAnalytics(gaMeasurementId)] : []),
    {
      name: 'netlify-spa-redirects',
      closeBundle() {
        writeFileSync(resolve('dist/_redirects'), '/*    /index.html   200\n')
      },
    },
  ],
  }
})

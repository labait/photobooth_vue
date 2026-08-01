import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'

import * as Sentry from "@sentry/vue";

useAuth().initAuth()

const app = createApp(App)

Sentry.init({
  app,
  dsn: "https://bf38571671931a879ffba55b0426bb26@o4509145706332160.ingest.de.sentry.io/4511832823562320",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/vue/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: []
  }
});

app.use(router)
.mount('#app')



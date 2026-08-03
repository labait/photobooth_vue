import { createRouter, createWebHistory } from 'vue-router'
import SplashScreen from '../components/SplashScreen.vue'
import TestView from '../components/TestView.vue'
import List from '../components/List.vue'
import Cam from '../components/Cam.vue'
import Detail from '../components/Detail.vue'
import Posters from '../components/Posters.vue'
import Admin from '../components/Admin.vue'
import MaintenanceView from '../components/MaintenanceView.vue'
import OpeningView from '../components/OpeningView.vue'
import { isTrue, hasLoginBypassQuery } from '../composables/useUtils'
import { checkOpening, getOpeningConfig } from '../composables/useOpening'
import { useAuth } from '../composables/useAuth'

const routes = [
  {
    path: '/',
    name: 'home',
    component: SplashScreen
  },
  {
    path: '/maintenance',
    name: 'maintenance',
    component: MaintenanceView,
  },
  {
    path: '/opening',
    name: 'opening',
    component: OpeningView,
  },
  {
    path: '/test',
    name: 'test',
    component: TestView,
    meta: { requiresAuth: true },
  },
  {
    path: '/cam',
    name: 'cam',
    component: Cam
  },
  {
    path: '/list',
    name: 'list',
    component: List,
  },
  {
    path: '/posters',
    name: 'posters',
    component: Posters,
  },
  {
    path: '/detail/:docId',
    name: 'detail',
    component: Detail,
  },
  {
    path: '/admin',
    name: 'admin',
    component: Admin,
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (hasLoginBypassQuery(to)) {
    next()
    return
  }

  const maintenance = isTrue(import.meta.env.VITE_MAINTENANCE)

  if (maintenance) {
    const { waitForAuth, isAdmin } = useAuth()
    await waitForAuth()

    if (isAdmin.value) {
      next()
      return
    }

    if (to.path === '/maintenance') {
      next()
      return
    }

    next('/maintenance')
    return
  }

  if (to.path === '/maintenance') {
    next('/')
    return
  }

  const { waitForAuth, isAdmin } = useAuth()
  await waitForAuth()

  if (isAdmin.value) {
    next()
    return
  }

  const openingConfigured = getOpeningConfig().isConfigured
  const isOpen = checkOpening({ maintenanceActive: false })

  if (!openingConfigured || isOpen) {
    if (to.path === '/opening') {
      next('/')
      return
    }
    next()
    return
  }

  if (to.path === '/opening') {
    next()
    return
  }

  next('/opening')
})

export default router

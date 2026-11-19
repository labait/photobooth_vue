import { computed } from 'vue'
import { isTrue } from './useUtils'
import { useAuth } from './useAuth'

export const ALLOW_CREATE = isTrue(import.meta.env.VITE_ALLOW_CREATE)
export const ALLOW_LIST = isTrue(import.meta.env.VITE_ALLOW_LIST)
export const LIST_ITEMS = Math.max(1, Number(import.meta.env.VITE_LIST_ITEMS) || 50)
export const LIST_CYCLE_MS = Math.max(
  1000,
  (Number(import.meta.env.VITE_LIST_CYCLE_SECONDS) || 226) * 1000,
)
// Intervallo di ricarica della lista in /list (0 o assente = disattivato)
export const LIST_REFRESH_MS = Math.max(
  0,
  (Number(import.meta.env.VITE_LIST_REFRESH_SECONDS) || 0) * 1000,
)

const CREATE_PATHS = new Set(['/posters', '/cam'])
const LIST_PATHS = new Set(['/list'])

export function canAccessCreate(isAdmin) {
  return ALLOW_CREATE || isAdmin
}

export function canAccessList(isAdmin) {
  return ALLOW_LIST || isAdmin
}

export function isCreateRoute(path) {
  return CREATE_PATHS.has(path)
}

export function isListRoute(path) {
  return LIST_PATHS.has(path)
}

let showUnavailableDialogHandler = null

export function registerFeatureUnavailableDialog(handler) {
  showUnavailableDialogHandler = handler
}

export function showFeatureUnavailableDialog(navigateHome) {
  showUnavailableDialogHandler?.(navigateHome)
}

export function useFeatureVisibility() {
  const { isAdmin, authReady } = useAuth()

  const showCreateButton = computed(() => {
    if (ALLOW_CREATE) return true
    return authReady.value && isAdmin.value
  })

  const showListButton = computed(() => {
    if (ALLOW_LIST) return true
    return authReady.value && isAdmin.value
  })

  return { showCreateButton, showListButton }
}

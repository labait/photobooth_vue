import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const DAY_MS = 24 * 60 * 60 * 1000

export function useGenerationCounts({
  global,
  edition,
  parseGenerations,
  storeValue,
  storageKeyPrefix,
  limitTotalTimeframe = 0,
}) {
  let unsubscribe = null
  let dailyInterval = null
  let lastSnapshot = null

  function refreshUserCount() {
    const raw = storeValue('generations') ?? ''
    global.value.generations_count_user = parseGenerations(raw).length
  }

  function updateFirebaseCounts(snapshot) {
    const now = Date.now()
    const dayAgoMs = now - DAY_MS
    const totalWindowStart = limitTotalTimeframe
      ? now - limitTotalTimeframe * 1000
      : 0

    global.value.generations_count_total = snapshot.size
    global.value.generations_count_daily = snapshot.docs.filter((doc) => {
      const ms = doc.data().timestamp?.toMillis?.() ?? 0
      return ms >= dayAgoMs
    }).length
    global.value.generations_count_total_window = snapshot.docs.filter((doc) => {
      const ms = doc.data().timestamp?.toMillis?.() ?? 0
      if (!limitTotalTimeframe) return false
      return ms >= totalWindowStart
    }).length
  }

  function subscribeFirebaseCounts() {
    unsubscribe?.()
    if (dailyInterval) {
      clearInterval(dailyInterval)
      dailyInterval = null
    }
    lastSnapshot = null

    if (!edition) {
      global.value.generations_count_total = 0
      global.value.generations_count_daily = 0
      global.value.generations_count_total_window = 0
      return
    }

    const itemsQuery = query(
      collection(db, 'items'),
      where('edition', '==', edition)
    )

    unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        lastSnapshot = snapshot
        updateFirebaseCounts(snapshot)
      },
      (error) => {
        console.error('[useGenerationCounts] snapshot error', error)
      }
    )

    dailyInterval = setInterval(() => {
      if (lastSnapshot) {
        updateFirebaseCounts(lastSnapshot)
      }
    }, 60_000)
  }

  function onStorage(event) {
    if (event.key === `${storageKeyPrefix}generations`) {
      refreshUserCount()
    }
  }

  function init() {
    refreshUserCount()
    subscribeFirebaseCounts()
    window.addEventListener('storage', onStorage)
  }

  function destroy() {
    unsubscribe?.()
    unsubscribe = null
    if (dailyInterval) {
      clearInterval(dailyInterval)
      dailyInterval = null
    }
    lastSnapshot = null
    window.removeEventListener('storage', onStorage)
  }

  return { refreshUserCount, init, destroy }
}

import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { isSuccessfulGeneration } from '../itemStorage'

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

  function countSuccessful(docs, minTimestampMs = 0) {
    return docs.filter((docSnap) => {
      const data = docSnap.data()
      const ms = data.timestamp?.toMillis?.() ?? 0
      if (minTimestampMs && ms < minTimestampMs) return false
      return isSuccessfulGeneration(data)
    }).length
  }

  function updateFirebaseCounts(snapshot) {
    const now = Date.now()
    const dayAgoMs = now - DAY_MS
    const totalWindowStart = limitTotalTimeframe
      ? now - limitTotalTimeframe * 1000
      : 0

    global.value.generations_count_total = countSuccessful(snapshot.docs)
    global.value.generations_count_daily = countSuccessful(snapshot.docs, dayAgoMs)
    global.value.generations_count_total_window = limitTotalTimeframe
      ? countSuccessful(snapshot.docs, totalWindowStart)
      : 0
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

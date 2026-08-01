import { isRef, toRaw } from 'vue'

export function isTrue(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value == null) return false

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') {
      return false
    }
  }

  return Boolean(value)
}

export function timeframeHuman(seconds) {
  const totalSeconds = Math.floor(Number(seconds) || 0)

  if (totalSeconds < 60) {
    return `${totalSeconds} ${totalSeconds === 1 ? 'secondo' : 'secondi'}`
  }

  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'}`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'ora' : 'ore'}`
  }

  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'giorno' : 'giorni'}`
}

export function toPlain(value, seen = new WeakSet()) {
  if (isRef(value)) {
    return toPlain(value.value, seen)
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`
  }

  if (value === null || typeof value !== 'object') {
    return value
  }

  const raw = toRaw(value)
  if (seen.has(raw)) {
    return '[Circular]'
  }
  seen.add(raw)

  if (Array.isArray(raw)) {
    return raw.map((item) => toPlain(item, seen))
  }

  return Object.fromEntries(
    Object.entries(raw).map(([key, entry]) => [key, toPlain(entry, seen)])
  )
}

export function useUtils() {
  return { isTrue, toPlain, timeframeHuman }
}

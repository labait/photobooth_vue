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
  return { isTrue, toPlain }
}

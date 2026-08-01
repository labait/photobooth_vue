const DAY_NAMES = {
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
  7: 'Domenica',
}

function parseEnvList(value) {
  if (value == null || value === '') return []

  return String(value)
    .split(',')
    .map((part) => part.trim().replace(/[;]+$/, ''))
    .filter(Boolean)
}

function parseOpeningDays(value) {
  return parseEnvList(value)
    .map((part) => Number(part))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
}

function parseTimePart(raw) {
  const normalized = String(raw).trim().replace(/\./g, ':')
  const [hoursPart, minutesPart] = normalized.split(':')
  const hours = Number(hoursPart)
  const minutes = minutesPart == null || minutesPart === '' ? 0 : Number(minutesPart)

  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return null
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return null

  return { hours, minutes, totalMinutes: hours * 60 + minutes }
}

function parseOpeningHours(value) {
  return parseEnvList(value)
    .map((interval) => {
      const dashIndex = interval.indexOf('-')
      if (dashIndex <= 0) return null

      const start = parseTimePart(interval.slice(0, dashIndex))
      const end = parseTimePart(interval.slice(dashIndex + 1))
      if (!start || !end) return null

      return { start, end, raw: interval }
    })
    .filter(Boolean)
}

function toIsoWeekday(date) {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

function formatTimePart({ hours, minutes }) {
  if (minutes === 0) return String(hours)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

function formatInterval({ start, end }) {
  return `${formatTimePart(start)}-${formatTimePart(end)}`
}

function parseOpeningText(value) {
  if (value == null) return null

  const text = String(value).trim()
  return text === '' ? null : text
}

export function getOpeningConfig() {
  const days = parseOpeningDays(import.meta.env.VITE_OPENING_DAYS)
  const hours = parseOpeningHours(import.meta.env.VITE_OPENING_HOURS)
  const customText = parseOpeningText(import.meta.env.VITE_OPENING_TEXT)

  return {
    days,
    hours,
    customText,
    dayLabels: days.map((day) => DAY_NAMES[day]).filter(Boolean),
    hourLabels: hours.map(formatInterval),
    isConfigured: days.length > 0 && hours.length > 0,
  }
}

export function isOpeningHoursActive(date = new Date()) {
  const { days, hours, isConfigured } = getOpeningConfig()
  if (!isConfigured) return true

  const isoWeekday = toIsoWeekday(date)
  if (!days.includes(isoWeekday)) return false

  const nowMinutes = date.getHours() * 60 + date.getMinutes()

  return hours.some(({ start, end }) => (
    nowMinutes >= start.totalMinutes && nowMinutes <= end.totalMinutes
  ))
}

export function checkOpening({ maintenanceActive = false } = {}) {
  if (maintenanceActive) return true

  const { isConfigured } = getOpeningConfig()
  if (!isConfigured) return true

  return isOpeningHoursActive()
}

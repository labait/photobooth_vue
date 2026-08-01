import { buildGtagConfig } from '../analytics.gtag.config.mjs'

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-095ZWPCW75'

export function isAnalyticsEnabled() {
  return GA_MEASUREMENT_ID.length > 0
}

export function trackPageView(pagePath) {
  if (!isAnalyticsEnabled() || typeof window.gtag !== 'function') return

  window.gtag('config', GA_MEASUREMENT_ID, buildGtagConfig({
    page_path: pagePath,
  }))
}

/** Technical / aggregate events only — do not pass user ids, emails, or doc ids. */
export function trackEvent(eventName, params = {}) {
  if (!isAnalyticsEnabled() || typeof window.gtag !== 'function') return

  window.gtag('event', eventName, params)
}

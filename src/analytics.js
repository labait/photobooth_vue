export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''

export function isAnalyticsEnabled() {
  return GA_MEASUREMENT_ID.length > 0
}

export function trackPageView(pagePath) {
  if (!isAnalyticsEnabled() || typeof window.gtag !== 'function') return

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: pagePath,
  })
}

export function trackEvent(eventName, params = {}) {
  if (!isAnalyticsEnabled() || typeof window.gtag !== 'function') return

  window.gtag('event', eventName, params)
}

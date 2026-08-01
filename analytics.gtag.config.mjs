/**
 * Privacy-first GA4 defaults: aggregate traffic / load only.
 * No persistent client id, no ads/demographics signals, no cross-session profiling.
 */
export const GA_GTAG_CONFIG = {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  anonymize_ip: true,
  client_storage: 'none',
  send_page_view: true,
}

export function buildGtagConfig(overrides = {}) {
  return { ...GA_GTAG_CONFIG, ...overrides }
}

export function buildGtagConfigScript(measurementId) {
  const config = JSON.stringify(buildGtagConfig())
  return `gtag('config', '${measurementId}', ${config});`
}

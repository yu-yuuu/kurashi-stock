export function measurementId(value: unknown): string | null {
  return typeof value === 'string' && /^G-[A-Z0-9]+$/.test(value.trim()) ? value.trim() : null
}
export const analyticsId = measurementId(import.meta.env.VITE_GA_MEASUREMENT_ID)
const key = `kurashi-stock-analytics:${import.meta.env.BASE_URL}`
type AnalyticsWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  [key: `ga-disable-${string}`]: boolean
}
const analyticsWindow = window as unknown as AnalyticsWindow
let loaded = false

export function analyticsAllowed() {
  try { return localStorage.getItem(key) === 'allowed' } catch { return false }
}
export function setAnalyticsAllowed(allowed: boolean) {
  try { localStorage.setItem(key, allowed ? 'allowed' : 'denied') } catch { /* Session preference still applies. */ }
  if (analyticsId) analyticsWindow[`ga-disable-${analyticsId}`] = !allowed
  if (allowed) startAnalytics(true)
}
export function startAnalytics(allowed = analyticsAllowed()) {
  if (!analyticsId || !allowed || loaded) return
  loaded = true
  analyticsWindow[`ga-disable-${analyticsId}`] = false
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || []
  analyticsWindow.gtag = function () { analyticsWindow.dataLayer!.push(arguments) }
  const gtag = analyticsWindow.gtag
  gtag('consent', 'default', {
    analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  })
  gtag('js', new Date())
  // Never send hash routes, product IDs, search text, stock, tags, or notes.
  gtag('set', { page_location: `${location.origin}${location.pathname}`, page_referrer: '', page_title: 'くらしの在庫' })
  gtag('config', analyticsId, {
    send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
    cookie_path: new URL(import.meta.env.BASE_URL, location.href).pathname,
  })
  gtag('event', 'page_view')
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`
  document.head.append(script)
}

let registration: ServiceWorkerRegistration | undefined
export async function registerPwa() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator) || !window.isSecureContext) return
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    const notify = () => {
      if (registration?.waiting && navigator.serviceWorker.controller)
        window.dispatchEvent(new Event('app-update-ready'))
    }
    notify()
    registration.addEventListener('updatefound', () => {
      registration?.installing?.addEventListener('statechange', notify)
    })
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void registration?.update().catch(() => {})
    })
  } catch {
    // Cache/storage/network restrictions must not prevent inventory use.
  }
}
export function hasPwaUpdate() { return !!registration?.waiting && !!navigator.serviceWorker?.controller }
export function applyPwaUpdate() {
  if (!registration?.waiting) return
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  registration.waiting.postMessage('ACTIVATE_UPDATE')
}

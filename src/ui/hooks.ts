import { useEffect, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { inventory } from '../data/inventory'
import type { InventoryData } from '../domain/models'
import { errorMessage } from '../domain/validation'
import { parseRoute } from './routing'
import { today } from './format'

export function useToday() {
  const [date, setDate] = useState(today)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function refresh() {
      clearTimeout(timer)
      setDate(today())
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = setTimeout(refresh, Math.max(1000, next.getTime() - now.getTime() + 100))
    }
    function resume() {
      if (document.visibilityState === 'visible') refresh()
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', resume)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [])
  return date
}
export function useInventory() {
  const [data, setData] = useState<InventoryData>()
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(() => inventory.read()).subscribe({
      next: (value) => {
        setData(value)
        setError('')
      },
      error: (reason) => setError(errorMessage(reason)),
    })
    return () => subscription.unsubscribe()
  }, [])
  return { data, error }
}
export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const change = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  return route
}
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const running = useRef(false)
  async function run(action: () => Promise<void>) {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      running.current = false
      setBusy(false)
    }
  }
  return { busy, error, run, setError }
}

import { useEffect, useState } from 'react'
import { applyPwaUpdate, hasPwaUpdate } from '../platform/pwa'

export default function PwaTools() {
  const [update, setUpdate] = useState(hasPwaUpdate)
  const [offline, setOffline] = useState(!navigator.onLine)
  const serviceWorker = navigator.serviceWorker
  const offlineSupported = window.isSecureContext && !!serviceWorker && !import.meta.env.DEV
  const [offlineReady, setOfflineReady] = useState(!!serviceWorker?.controller)
  useEffect(() => {
    const ready = () => setUpdate(true)
    const connection = () => setOffline(!navigator.onLine)
    const checkOfflineReady = () => setOfflineReady(!!serviceWorker?.controller)
    window.addEventListener('app-update-ready', ready)
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    serviceWorker?.addEventListener('controllerchange', checkOfflineReady)
    checkOfflineReady()
    return () => {
      window.removeEventListener('app-update-ready', ready)
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
      serviceWorker?.removeEventListener('controllerchange', checkOfflineReady)
    }
  }, [serviceWorker])
  return <section className="backup-guidance" aria-label="ホーム画面への追加と更新">
    <h3>ホーム画面に追加して使う</h3>
    {offlineSupported && <p>SafariまたはChromeのメニューからホーム画面に追加し、初回は通信できる状態で開いてください。</p>}
    <p role="status">{!offlineSupported
      ? 'この環境ではオフラインで起動できません。'
      : offlineReady
        ? 'オフラインで起動・保存できます。'
        : 'オフライン起動の準備には通信が必要です。'}</p>
    {offline && <p role="status">オフラインです。</p>}
    {update && <>
      <p>すべてのタブで編集を終えてから更新してください。</p>
      <button className="button secondary" onClick={applyPwaUpdate}>新しい版に更新する</button>
    </>}
  </section>
}

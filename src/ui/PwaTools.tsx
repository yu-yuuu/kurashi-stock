import { useEffect, useState } from 'react'
import { applyPwaUpdate, hasPwaUpdate } from '../platform/pwa'
import { protectInventoryStorage, type StorageProtection } from '../platform/storage'

export default function PwaTools() {
  const [update, setUpdate] = useState(hasPwaUpdate)
  const [offline, setOffline] = useState(!navigator.onLine)
  const serviceWorker = navigator.serviceWorker
  const [offlineReady, setOfflineReady] = useState(!!serviceWorker?.controller)
  const [protection, setProtection] = useState<StorageProtection>()
  useEffect(() => {
    let active = true
    void protectInventoryStorage().then(value => { if (active) setProtection(value) })
    return () => { active = false }
  }, [])
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
    {window.isSecureContext && <p>SafariまたはChromeのメニューからホーム画面に追加し、初回は通信できる状態で開いてください。</p>}
    <p role="status">{protection === 'protected'
      ? '保存領域の保護が有効です。'
      : protection === 'standard' || protection === 'unsupported' ? '通常の保存が有効です。'
      : protection === 'unavailable' ? '保存領域の保護を確認できませんでした。'
      : '保存領域の保護を確認しています…'}</p>
    <p role="status">{!window.isSecureContext
      ? 'スマホのオフライン起動にはHTTPSが必要です。'
      : !serviceWorker || import.meta.env.DEV
        ? 'この環境ではオフライン起動を利用できません。'
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

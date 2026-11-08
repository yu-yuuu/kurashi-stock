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
    <p>iPhoneはSafariの共有メニューから「ホーム画面に追加」、AndroidはChromeのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。</p>
    <p>初回は通信が必要です。スマホではHTTPSのURLを使い、追加したアプリを通信できる状態で開いてください。</p>
    <p>通常のタブ切替やアプリ更新では在庫を削除しません。同じURL・ブラウザの保存領域を使うタブやPWAでは在庫を共有し、戻った際にも最新の内容を読み直します。</p>
    <p>iPhoneのSafariとホーム画面アプリなど、保存領域が分かれる環境では自動共有できません。普段使う方を決め、移行時はバックアップを保存・復元してください。別ブラウザ・別端末・異なるURL間の自動同期には対応していません。</p>
    <p role="status">{protection === 'protected'
      ? '保存領域の保護が有効です。空き容量不足による自動削除を抑えます。'
      : protection === 'standard' ? '通常の保存が有効です。保存領域の保護はブラウザが判断し、今回は許可されませんでした。'
      : protection === 'unsupported' ? '通常の保存が有効です。この環境では保存領域の保護機能を利用できません。'
      : protection === 'unavailable' ? '保存領域の保護を確認できませんでした。在庫の自動保存とは別の機能です。'
      : '保存領域の保護を確認しています…'}</p>
    <p>サイトデータの削除・端末故障・プライベートブラウズ終了による消失は防げません。大切な在庫はJSONバックアップも保管してください。</p>
    <p role="status">{!window.isSecureContext
      ? 'この確認URLではオフライン起動を利用できません。スマホではHTTPSのURLをご利用ください。'
      : !serviceWorker || import.meta.env.DEV
        ? 'この環境ではオフライン起動を利用できません。'
        : offlineReady
          ? 'オフラインで起動・保存できます。'
          : 'オフライン起動の準備ができていません。通信できる状態で開き、表示が変わらない場合は再読み込みしてください。'}</p>
    {offline && <p role="status">オフラインです。在庫の操作は端末内へ保存できます。</p>}
    {update && <>
      <p>新しい版があります。編集中の入力を確定し、他のタブの操作も終えてから更新してください。</p>
      <button className="button secondary" onClick={applyPwaUpdate}>新しい版に更新する</button>
    </>}
  </section>
}

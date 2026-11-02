import { useEffect, useState } from 'react'
import { applyPwaUpdate, hasPwaUpdate } from '../platform/pwa'

export default function PwaTools() {
  const [update, setUpdate] = useState(hasPwaUpdate)
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const ready = () => setUpdate(true)
    const connection = () => setOffline(!navigator.onLine)
    window.addEventListener('app-update-ready', ready)
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    return () => {
      window.removeEventListener('app-update-ready', ready)
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
    }
  }, [])
  return <section className="backup-guidance" aria-label="ホーム画面への追加と更新">
    <h3>ホーム画面に追加して使う</h3>
    <p>iPhoneはSafariの共有メニューから「ホーム画面に追加」、AndroidはChromeのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。</p>
    <p>初回は通信が必要です。読み込み完了後はオフラインでも起動・保存できます。保存先はこの端末のブラウザ内です。移行や端末故障に備える場合はJSONバックアップをご利用ください。</p>
    {!window.isSecureContext && <p>この確認URLではオフライン起動を利用できません。公開後のHTTPSのURLをご利用ください。</p>}
    {offline && <p role="status">オフラインです。在庫の操作は端末内へ保存できます。</p>}
    {update && <>
      <p>新しい版があります。編集中の入力を確定し、他のタブの操作も終えてから更新してください。</p>
      <button className="button secondary" onClick={applyPwaUpdate}>新しい版に更新する</button>
    </>}
  </section>
}

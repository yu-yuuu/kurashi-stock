import { useState } from 'react'
import { analyticsAllowed, analyticsId, setAnalyticsAllowed } from '../platform/analytics'

export default function AnalyticsSettings() {
  const [allowed, setAllowed] = useState(analyticsAllowed)
  return <section className="backup-guidance" aria-label="アクセス解析の設定">
    <h3>アクセス解析</h3>
    <p>広告は表示しません。在庫データはこの端末内に保存します。</p>
    {analyticsId ? <>
      <p>許可すると、Googleアナリティクスで起動時の閲覧と利用環境を計測します。Cookieを使用し、IPアドレスなどの通信情報がGoogleへ送信されます。商品名・数量・タグ・メモ・検索内容は送信しません。いつでも変更でき、許可しなくてもすべての在庫機能を使えます。</p>
      <label className="checkbox-label">
        <input type="checkbox" checked={allowed} onChange={event => {
          setAllowed(event.target.checked)
          setAnalyticsAllowed(event.target.checked)
        }} />
        アクセス解析を許可する
      </label>
      <p><a href="https://policies.google.com/privacy?hl=ja" target="_blank" rel="noreferrer">Googleのプライバシーポリシー</a></p>
    </> : <p>現在、アクセス解析は無効です。</p>}
  </section>
}

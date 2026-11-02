import { useState } from 'react'
import type { Product } from '../domain/models'
import { inventory } from '../data/inventory'
import { navigate } from './routing'
import { useAction } from './hooks'
import Dialog from './Dialog'

export default function DeleteProduct({
  product,
  lotCount,
  transactionCount,
  onSaved,
}: {
  product: Product
  lotCount: number
  transactionCount: number
  onSaved: (message: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const action = useAction()
  function remove() {
    void action.run(async () => {
      await inventory.deleteProduct(product.id)
      navigate('/')
      onSaved('商品と関連する在庫・履歴を削除しました。')
    })
  }
  return (
    <>
      <section className="delete-product" aria-label="商品の削除">
        <h2>商品の削除</h2>
        <p>商品・在庫・入出庫履歴がすべて消えます。この操作は元に戻せません。</p>
        <button
          className="button danger"
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true })
            action.setError('')
            setConfirming(true)
          }}
        >
          この商品を削除
        </button>
      </section>
      {confirming && (
        <Dialog title="商品を削除" onClose={() => setConfirming(false)} busy={action.busy}>
          <div className="dialog-body space-y-5">
            <div className="restore-warning">
              <strong>「{product.name}」を削除しますか？</strong>
              <p>
                この商品と在庫 {lotCount} ロット、入出庫履歴 {transactionCount} 件を削除します。
                元に戻せません。必要なデータは先にメニューからバックアップしてください。
              </p>
              <p>他の商品と、共有しているタグ自体は残ります。</p>
            </div>
            {action.error && (
              <p className="error" role="alert">
                {action.error}
              </p>
            )}
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={action.busy}
                onClick={() => setConfirming(false)}
              >
                キャンセル
              </button>
              <button className="button danger" disabled={action.busy} onClick={remove}>
                {action.busy ? '削除中…' : '商品・在庫・履歴を削除'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  )
}

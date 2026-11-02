import { useState, type FormEvent } from 'react'
import type { ProductSummary, StockLot, StockTransaction } from '../domain/models'
import { inventory } from '../data/inventory'
import { ensure } from '../domain/validation'
import { sortLots } from '../domain/selectors'
import { useAction } from './hooks'
import { expiration, number } from './format'
import Dialog from './Dialog'
import StockFields, { stockQuantity, toStockInput, type StockDraft } from './StockFields'

function localDateTime(iso: string) {
  const date = new Date(iso)
  const pad = (value: number, digits = 2) => String(value).padStart(digits, '0')
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function TransactionEdit({ product, transaction, lots, onClose, onSaved }: {
  product: ProductSummary
  transaction: StockTransaction
  lots: StockLot[]
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [direction, setDirection] = useState<'in' | 'out'>(transaction.quantityChange > 0 ? 'in' : 'out')
  const [draft, setDraft] = useState<StockDraft>({ quantity: String(Math.abs(transaction.quantityChange)),
    expirationType: transaction.expirationTypeSnapshot, expirationDate: transaction.expirationDateSnapshot ?? '', memo: transaction.memo })
  const [lotId, setLotId] = useState(transaction.lotId)
  const [operatedAt, setOperatedAt] = useState(() => localDateTime(transaction.operatedAt))
  const action = useAction()
  const out = direction === 'out'
  const selected = lots.find((lot) => lot.id === lotId)
  const max = selected ? selected.quantity + (selected.id === transaction.lotId ? -transaction.quantityChange : 0) : undefined
  function submit(event: FormEvent) {
    event.preventDefault()
    void action.run(async () => {
      const time = new Date(operatedAt)
      ensure(operatedAt && Number.isFinite(time.getTime()), '有効な操作日時を入力してください。')
      const common = { quantity: stockQuantity(draft.quantity), memo: draft.memo, operatedAt: operatedAt === localDateTime(transaction.operatedAt) ? transaction.operatedAt : time.toISOString() }
      await inventory.editTransaction(transaction.id,
        out ? { ...common, direction: 'out', lotId } : { ...toStockInput(draft), direction: 'in', operatedAt: common.operatedAt }, transaction)
      onSaved('履歴と在庫を更新しました。')
      onClose()
    })
  }
  return (
    <Dialog title="入出庫履歴を編集" onClose={onClose} busy={action.busy}>
      <form onSubmit={submit} noValidate className="dialog-body">
        <p className="dialog-product">{product.name}</p>
        <p className="field-help mb-4">記録した内容を修正できます。保存すると現在の在庫数も更新します。</p>
        <fieldset disabled={action.busy} className="space-y-5">
          <label className="field">操作の種類
            <select value={direction} onChange={(event) => setDirection(event.target.value as 'in' | 'out')}>
              <option value="in">入庫</option><option value="out">出庫</option>
            </select>
          </label>
          <label className="field">操作日時 <span className="required">必須</span>
            <input type="datetime-local" step="60" min="0001-01-01T00:00" max="9999-12-31T23:59"
              value={operatedAt} onChange={(event) => setOperatedAt(event.target.value)} required />
          </label>
          {out && <label className="field">対象ロット <span className="required">必須</span>
            <select value={selected ? lotId : ''} onChange={(event) => setLotId(event.target.value)}>
              <option value="">ロットを選択してください</option>
              {sortLots(lots).map((lot) => <option key={lot.id} value={lot.id}>{expiration(lot.expirationType, lot.expirationDate)} · 残数 {number(lot.quantity)} 個</option>)}
            </select>
          </label>}
          <StockFields value={draft} onChange={setDraft} out={out} max={out ? Math.max(0, max ?? 0) : undefined} />
          {!out && <p className="field-help">期限の修正はこの入庫記録に反映します。他の履歴は変更しません。元の在庫が出庫済みで不足する場合は保存できません。</p>}
          {action.error && <p role="alert" className="error">{action.error}</p>}
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={onClose}>キャンセル</button>
            <button type="submit" className="button primary">{action.busy ? '保存中…' : '履歴の変更を保存'}</button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  )
}

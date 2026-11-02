import { expirationLabels, type ExpirationType } from '../domain/models'
export interface StockDraft {
  quantity: string
  expirationType: ExpirationType
  expirationDate: string
  memo: string
}
export const blankStock: StockDraft = {
  quantity: '1',
  expirationType: 'best_before',
  expirationDate: '',
  memo: '',
}
export const stockQuantity = (value: string) => /^\d+$/.test(value) ? Number(value) : NaN
export const toStockInput = (draft: StockDraft) => ({
  quantity: stockQuantity(draft.quantity),
  expirationType: draft.expirationType,
  expirationDate: draft.expirationType === 'none' ? null : draft.expirationDate,
  memo: draft.memo.trim(),
})
function selectQuantity(input: HTMLInputElement) {
  const value = input.value
  input.select()
  // iOS may move the caret after its tap handling. Apply the selection once that finishes.
  window.setTimeout(() => {
    if (document.activeElement === input && input.value === value)
      input.setSelectionRange(0, value.length)
  }, 0)
}
export default function StockFields({
  value,
  onChange,
  out = false,
  max,
}: {
  value: StockDraft
  onChange: (value: StockDraft) => void
  out?: boolean
  max?: number
}) {
  const update = (patch: Partial<StockDraft>) => onChange({ ...value, ...patch })
  return (
    <>
      <label className="field">
        数量 <span className="required">必須</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value.quantity}
          onFocus={(event) => selectQuantity(event.currentTarget)}
          onClick={(event) => selectQuantity(event.currentTarget)}
          onTouchEnd={(event) => selectQuantity(event.currentTarget)}
          onChange={(e) => update({ quantity: e.target.value })}
          required
        />
        {max !== undefined && <span className="field-help">出庫できる数量：{max} 個</span>}
      </label>
      {!out && (
        <>
          <label className="field">
            期限種別 <span className="required">必須</span>
            <select
              value={value.expirationType}
              onChange={(e) =>
                update({ expirationType: e.target.value as ExpirationType, expirationDate: '' })
              }
            >
              {Object.entries(expirationLabels).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {value.expirationType !== 'none' && (
            <label className="field">
              期限日 <span className="required">必須</span>
              <input
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                value={value.expirationDate}
                onChange={(e) => update({ expirationDate: e.target.value })}
                required
              />
            </label>
          )}
        </>
      )}
      <label className="field">
        メモ <span className="optional">任意</span>
        <textarea
          rows={2}
          maxLength={1000}
          placeholder={out ? '例：夕食で使った' : '例：週末のまとめ買い'}
          value={value.memo}
          onChange={(e) => update({ memo: e.target.value })}
        />
      </label>
    </>
  )
}

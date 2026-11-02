import { useState, type FormEvent } from 'react'
import { inventory } from '../data/inventory'
import type { ProductSummary, StockLot, Tag } from '../domain/models'
import { cleanName } from '../domain/validation'
import { sortLots } from '../domain/selectors'
import Dialog from './Dialog'
import StockFields, { blankStock, stockQuantity, toStockInput, type StockDraft } from './StockFields'
import { useAction } from './hooks'
import { expiration, number } from './format'

export default function StockDialog({
  mode,
  product,
  lots,
  tags,
  onClose,
  onSaved,
}: {
  mode: 'in' | 'out'
  product: ProductSummary
  lots: StockLot[]
  tags: Tag[]
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [draft, setDraft] = useState<StockDraft>(blankStock)
  const [lotId, setLotId] = useState(() => {
    const positiveLots = lots.filter((lot) => lot.quantity > 0)
    return positiveLots.length === 1 ? positiveLots[0].id : ''
  })
  const action = useAction()
  const [changeTags, setChangeTags] = useState(false)
  const [tagIds, setTagIds] = useState(product.tags.map((tag) => tag.id))
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const selectedTags = [...tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name), ...draftTags]
  const tagOptions = [...new Set([...tags.map((tag) => tag.name), ...draftTags])].sort((a, b) => a.localeCompare(b, 'ja'))
  function toggleTag(name: string, selected: boolean) {
    const existing = tags.find((tag) => tag.name === name)
    if (existing)
      setTagIds((ids) => selected ? [...new Set([...ids, existing.id])] : ids.filter((id) => id !== existing.id))
    setDraftTags((names) => selected && !existing ? [...new Set([...names, name])] : names.filter((tag) => tag !== name))
  }
  function addTag() {
    try {
      toggleTag(cleanName(newTag, 'タグ名', 40), true)
      setNewTag('')
      action.setError('')
    } catch (error) {
      action.setError((error as Error).message)
    }
  }
  const available = sortLots(lots.filter((lot) => lot.quantity > 0))
  const selected = available.find((lot) => lot.id === lotId)
  const out = mode === 'out'
  function submit(event: FormEvent) {
    event.preventDefault()
    void action.run(async () => {
      if (out)
        await inventory.stockOut(product.id, selected?.id ?? '', stockQuantity(draft.quantity), draft.memo,
          changeTags ? [...selectedTags, ...(newTag.trim() ? [newTag.trim()] : [])] : undefined)
      else await inventory.stockIn(product.id, toStockInput(draft))
      onSaved(out ? '出庫を記録しました。' : '入庫を記録しました。')
      onClose()
    })
  }
  return (
    <Dialog title={out ? '在庫を出庫' : '在庫を入庫'} onClose={onClose} busy={action.busy}>
      <form onSubmit={submit} noValidate className="dialog-body">
        <p className="dialog-product">{product.name}</p>
        <fieldset disabled={action.busy} className="space-y-5">
          {out && (
            <label className="field">
              出庫するロット <span className="required">必須</span>
              <select
                value={selected ? lotId : ''}
                onChange={(event) => setLotId(event.target.value)}
                required
              >
                <option value="">ロットを選択してください</option>
                {available.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {expiration(lot.expirationType, lot.expirationDate)} · 残数{' '}
                    {number(lot.quantity)} 個
                  </option>
                ))}
              </select>
              <span className="field-help">使った在庫の期限を確認して、選んでください。</span>
            </label>
          )}
          <StockFields
            value={draft}
            onChange={setDraft}
            out={out}
            max={out ? selected?.quantity : undefined}
          />
          {out && (
            <div className="stock-tags">
              <p className="field-help">現在のタグ：{product.tags.map((tag) => tag.name).join('・') || 'なし'}</p>
              <label className="checkbox-label mt-3">
                <input type="checkbox" checked={changeTags} onChange={(event) => setChangeTags(event.target.checked)} />
                <span>タグも一緒に変更する</span>
              </label>
              {changeTags && (
                <div className="mt-3 space-y-3">
                  <p className="field-help">商品全体のタグを変更します。ほかの期限の在庫にも共通です。出庫を確定するまで保存しません。</p>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => (
                      <button type="button" key={tag} className={`chip ${selectedTags.includes(tag) ? 'selected' : ''}`}
                        aria-pressed={selectedTags.includes(tag)} onClick={() => toggleTag(tag, !selectedTags.includes(tag))}>
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input aria-label="新しいタグ名" maxLength={40} value={newTag} placeholder="新しいタグを作成"
                      onChange={(event) => setNewTag(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                          event.preventDefault()
                          addTag()
                        }
                      }} />
                    <button type="button" className="button secondary shrink-0" onClick={addTag}>タグを追加</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {action.error && (
            <p className="error" role="alert">
              {action.error}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="button primary" disabled={out && !available.length}>
              {action.busy ? '保存中…' : out ? '出庫を記録' : '入庫を記録'}
            </button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  )
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ProductSummary, Tag } from '../domain/models'
import { cleanAliases, cleanName } from '../domain/validation'
import { inventory } from '../data/inventory'
import { navigate } from './routing'
import { useAction } from './hooks'
import Icon from './Icon'
import StockFields, { blankStock, toStockInput, type StockDraft } from './StockFields'
export default function ProductForm({
  product,
  tags,
  onSaved,
}: {
  product?: ProductSummary
  tags: Tag[]
  onSaved: (message: string) => void
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [aliases, setAliases] = useState(product?.aliases ?? [])
  const [aliasDraft, setAliasDraft] = useState('')
  const [selectedIds, setSelectedIds] = useState(product?.tags.map((tag) => tag.id) ?? [])
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [initial, setInitial] = useState(false)
  const [stock, setStock] = useState<StockDraft>(blankStock)
  const action = useAction()
  const selected = [
    ...tags.filter((tag) => selectedIds.includes(tag.id)).map((tag) => tag.name),
    ...draftTags,
  ]
  const available = [...new Set([...tags.map((tag) => tag.name), ...selected])].sort((a, b) =>
    a.localeCompare(b, 'ja'),
  )
  useEffect(() => {
    if (!product) return
    const created = tags.filter((tag) => draftTags.includes(tag.name))
    if (created.length) {
      setSelectedIds((ids) => [...new Set([...ids, ...created.map((tag) => tag.id)])])
      setDraftTags((names) => names.filter((name) => !created.some((tag) => tag.name === name)))
    }
  }, [tags, draftTags, product])
  const [composing, setComposing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const queue = useRef(Promise.resolve())
  const saved = useRef(JSON.stringify({ name: product?.name ?? '', aliases: product?.aliases ?? [], tagNames: selected }))
  function saveEdit(includeDrafts = false) {
    const input = {
      name,
      aliases: includeDrafts && aliasDraft.trim() ? [...aliases, aliasDraft] : aliases,
      tagNames: includeDrafts && newTag.trim() ? [...selected, newTag.trim()] : selected,
    }
    const key = JSON.stringify(input)
    const task = queue.current.catch(() => {}).then(async () => {
      if (saved.current === key) return
      setSaveStatus('保存中…')
      try {
        await inventory.saveProduct(input, product!.id)
        saved.current = key
        action.setError('')
        setSaveStatus('保存済み')
      } catch (error) {
        setSaveStatus('未保存')
        action.setError((error as Error).message)
        throw error
      }
    })
    queue.current = task
    return task
  }
  const editKey = JSON.stringify({ name, aliases, tagNames: selected })
  useEffect(() => {
    if (product && !composing) void saveEdit().catch(() => {})
  }, [editKey, composing])
  const cancel = () => {
    if (!product) return navigate('/')
    void action.run(async () => {
      await saveEdit(true)
      navigate(`/products/${product.id}`)
    })
  }
  function addAlias() {
    try {
      setAliases(cleanAliases([...aliases, aliasDraft]))
      setAliasDraft('')
      action.setError('')
    } catch (error) {
      action.setError((error as Error).message)
    }
  }
  function selectTag(name: string, select: boolean) {
    const existing = tags.find((tag) => tag.name === name)
    if (existing) {
      setSelectedIds((ids) =>
        select ? [...new Set([...ids, existing.id])] : ids.filter((id) => id !== existing.id),
      )
    }
    setDraftTags((names) =>
      select && !existing ? [...new Set([...names, name])] : names.filter((tag) => tag !== name),
    )
  }
  function addTag() {
    try {
      const tag = cleanName(newTag, 'タグ名', 40)
      selectTag(tag, true)
      setNewTag('')
      action.setError('')
    } catch (error) {
      action.setError((error as Error).message)
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (product) { cancel(); return }
    void action.run(async () => {
      const id = await inventory.saveProduct(
        {
          name,
          aliases: cleanAliases([...aliases, ...(aliasDraft.trim() ? [aliasDraft] : [])]),
          tagNames: [...selected, ...(newTag.trim() ? [newTag.trim()] : [])],
          initialStock: !product && initial ? toStockInput(stock) : undefined,
        },
        undefined,
      )
      onSaved('商品を登録しました。')
      navigate(`/products/${id}`)
    })
  }
  return (
    <section className="form-page">
      <button className="back-link" disabled={action.busy} onClick={cancel}>
        <Icon name="back" size={18} />
        {product ? '商品詳細に戻る' : '在庫一覧に戻る'}
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{product ? 'EDIT ITEM' : 'NEW ITEM'}</p>
          <h1>{product ? '商品を編集' : '商品を登録'}</h1>
          <p className="muted">いつも使うものを、ひとつずつ。</p>
        </div>
      </div>
      <form className="panel form-panel" onSubmit={submit} noValidate onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}>
        {product && <p className="field-help mb-3" role="status">変更は自動保存します。{saveStatus}</p>}
        <fieldset disabled={action.busy} className="space-y-6">
          <label className="field">
            商品名 <span className="required">必須</span>
            <input
              autoFocus
              maxLength={120}
              placeholder="例：牛乳、ティッシュペーパー"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <div>
            <p className="field-label">検索用の別名 <span className="optional">任意・10個まで</span></p>
            <p className="field-help mb-3">読み方や呼び名を登録できます。例：牛乳 → ぎゅうにゅう、ミルク</p>
            {aliases.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {aliases.map((alias) => (
                  <button
                    key={alias}
                    type="button"
                    className="chip selected"
                    aria-label={`別名「${alias}」を削除`}
                    onClick={() => setAliases(aliases.filter((value) => value !== alias))}
                  >
                    <span>{alias}</span><Icon name="close" size={14} />
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 alias-input-row">
              <input
                aria-label="検索用の別名"
                maxLength={80}
                placeholder="読み方・略称など"
                value={aliasDraft}
                onChange={(event) => setAliasDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    addAlias()
                  }
                }}
              />
              <button type="button" className="button secondary shrink-0" onClick={addAlias}>別名を追加</button>
            </div>
            <p className="field-help mt-2">ひらがな・カタカナ・半角カナの違いは検索時に吸収します。</p>
          </div>
          <div>
            <p className="field-label">
              タグ <span className="optional">任意・複数選択可</span>
            </p>
            <p className="field-help mb-3">保管場所や種類で分けると、あとで探しやすくなります。</p>
            {available.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {available.map((tag) => (
                  <button
                    type="button"
                    className={`chip ${selected.includes(tag) ? 'selected' : ''}`}
                    key={tag}
                    aria-pressed={selected.includes(tag)}
                    onClick={() => selectTag(tag, !selected.includes(tag))}
                  >
                    {selected.includes(tag) && <Icon name="check" size={14} />}
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                aria-label="新しいタグ名"
                maxLength={40}
                placeholder="新しいタグを作成"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <button className="button secondary shrink-0" type="button" onClick={addTag}>
                追加
              </button>
            </div>
          </div>
          {!product && (
            <div className="initial-stock">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={initial}
                  onChange={(e) => setInitial(e.target.checked)}
                />
                <span>
                  初期在庫を一緒に登録する<small>あとから入庫することもできます。</small>
                </span>
              </label>
              {initial && (
                <div className="mt-5 space-y-5">
                  <StockFields value={stock} onChange={setStock} />
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
            {product ? (
              <span className="field-help">画面上部の「商品詳細に戻る」から戻れます。</span>
            ) : (<>
              <button type="button" className="button secondary" onClick={cancel}>キャンセル</button>
              <button className="button primary" type="submit">{action.busy ? '保存中…' : '商品を登録'}</button>
            </>)}
          </div>
        </fieldset>
      </form>
    </section>
  )
}

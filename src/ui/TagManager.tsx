import { useState, type FormEvent } from 'react'
import type { ProductTag, Tag } from '../domain/models'
import { inventory } from '../data/inventory'
import { useAction } from './hooks'
import Icon from './Icon'
import Dialog from './Dialog'
import ScrollList from './ScrollList'

export default function TagManager({
  tags,
  links,
  onClose,
  onSaved,
}: {
  tags: Tag[]
  links: ProductTag[]
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [editing, setEditing] = useState<Tag>()
  const [removing, setRemoving] = useState<Tag>()
  const [name, setName] = useState('')
  const [newName, setNewName] = useState('')
  const action = useAction()
  const usage = (id: string) => links.filter((link) => link.tagId === id).length
  function reset() {
    setEditing(undefined)
    setRemoving(undefined)
    action.setError('')
  }
  function create(event: FormEvent) {
    event.preventDefault()
    void action.run(async () => {
      await inventory.createTag(newName)
      setNewName('')
      onSaved('タグを追加しました。')
    })
  }
  function rename(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    void action.run(async () => {
      await inventory.renameTag(editing.id, name)
      reset()
      onSaved('タグ名を変更しました。')
    })
  }
  function remove() {
    if (!removing) return
    void action.run(async () => {
      await inventory.deleteTag(removing.id)
      reset()
      onSaved('タグを削除しました。')
    })
  }
  return (
    <Dialog
      title={editing ? 'タグ名を変更' : removing ? 'タグを削除' : 'タグを編集'}
      onClose={onClose}
      busy={action.busy}
    >
      <div className="dialog-body">
        {editing ? (
          <form onSubmit={rename} noValidate>
            <fieldset disabled={action.busy} className="space-y-5">
              <p className="muted">変更はこのタグを使うすべての商品に反映されます。</p>
              <label className="field">
                タグ名
                <input
                  autoFocus
                  value={name}
                  maxLength={40}
                  required
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              {action.error && (
                <p className="error" role="alert">
                  {action.error}
                </p>
              )}
              <div className="form-actions">
                <button type="button" className="button secondary" onClick={reset}>
                  キャンセル
                </button>
                <button className="button primary" type="submit">
                  {action.busy ? '保存中…' : '名前を保存'}
                </button>
              </div>
            </fieldset>
          </form>
        ) : removing ? (
          <div className="space-y-5">
            <div className="restore-warning">
              <strong>「{removing.name}」を削除しますか？</strong>
              <p>
                {usage(removing.id)}{' '}
                件の商品からこのタグを外します。商品・在庫・入出庫履歴は残ります。
              </p>
            </div>
            {action.error && (
              <p className="error" role="alert">
                {action.error}
              </p>
            )}
            <div className="form-actions">
              <button className="button secondary" disabled={action.busy} onClick={reset}>
                キャンセル
              </button>
              <button className="button danger" disabled={action.busy} onClick={remove}>
                {action.busy ? '削除中…' : 'タグを削除する'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="muted mb-4">タグの追加・名前の変更・削除ができます。</p>
            <form onSubmit={create} noValidate className="mb-4">
              <fieldset disabled={action.busy}>
                <label className="field">新しいタグ名
                  <input value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} />
                </label>
                {action.error && <p role="alert" className="error">{action.error}</p>}
                <button type="submit" className="button primary mt-2">{action.busy ? '追加中…' : 'タグを追加'}</button>
              </fieldset>
            </form>
            {tags.length === 0 ? (
              <p className="section-empty">
                タグはまだありません。上の欄から追加できます。
              </p>
            ) : (
              <ScrollList label="タグ一覧">
                <ul className="tag-management-list">
                  {[...tags]
                    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                    .map((tag) => (
                      <li key={tag.id}>
                        <div className="tag-management-name">
                          <strong>{tag.name}</strong>
                          <span className="field-help">{usage(tag.id)} 件の商品</span>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`${tag.name}の名前を変更`}
                          onClick={() => {
                            setEditing(tag)
                            setName(tag.name)
                            action.setError('')
                          }}
                        >
                          <Icon name="edit" size={18} />
                        </button>
                        <button
                          className="button secondary"
                          aria-label={`${tag.name}を削除`}
                          onClick={() => {
                            setRemoving(tag)
                            action.setError('')
                          }}
                        >
                          削除
                        </button>
                      </li>
                    ))}
                </ul>
              </ScrollList>
            )}
          </>
        )}
      </div>
    </Dialog>
  )
}

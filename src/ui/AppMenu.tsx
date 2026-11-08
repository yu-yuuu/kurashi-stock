import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  exportBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  restoreBackup,
  type Backup,
} from '../data/backup'
import { ensure } from '../domain/validation'
import { downloadJson } from '../platform/files'
import { navigate } from './routing'
import { dateTime, number, today } from './format'
import { useAction } from './hooks'
import Icon from './Icon'
import Dialog from './Dialog'
import PwaTools from './PwaTools'
export default function AppMenu({
  onClose,
  onNotice,
  productCount,
  onManageTags,
}: {
  onClose: () => void
  onNotice: (message: string) => void
  productCount: number
  onManageTags: () => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const backupEntry = useRef<HTMLButtonElement>(null)
  const backupSave = useRef<HTMLButtonElement>(null)
  const [backupOpen, setBackupOpen] = useState(false)
  const [pending, setPending] = useState<{ backup: Backup; filename: string }>()
  const action = useAction()
  useEffect(() => {
    if (!pending) {
      const target = backupOpen ? backupSave.current : backupEntry.current
      target?.focus({ preventScroll: true })
    }
  }, [backupOpen, pending])
  function backup() {
    void action.run(async () => {
      downloadJson(await exportBackup(), `kurashi-stock-${today()}.json`)
      onNotice('バックアップのダウンロードを開始しました。')
    })
  }
  function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void action.run(async () => {
      ensure(
        file.size <= MAX_BACKUP_BYTES,
        'バックアップは20MB以下のJSONファイルを選択してください。',
      )
      setPending({ backup: parseBackup(await file.text()), filename: file.name })
    })
  }
  function restore() {
    if (!pending) return
    void action.run(async () => {
      await restoreBackup(pending.backup)
      navigate('/')
      onNotice('バックアップから復元しました。')
      onClose()
    })
  }
  return (
    <Dialog
      title={pending ? 'バックアップから復元' : backupOpen ? 'バックアップ連携' : 'メニュー'}
      onClose={onClose}
      busy={action.busy}
    >
      <div className="dialog-body">
        {pending ? (
          <div className="space-y-5">
            <div className="restore-warning">
              <strong>現在のデータをすべて置き換えます</strong>
              <p>
                この端末の既存データ（商品 {number(productCount)}{' '}
                件）は削除され、選択したファイルの内容になります。必要なら先にバックアップを保存してください。
              </p>
            </div>
            <dl className="backup-details">
              <div>
                <dt>ファイル</dt>
                <dd>{pending.filename}</dd>
              </div>
              <div>
                <dt>作成日時</dt>
                <dd>{dateTime(pending.backup.exportedAt)}</dd>
              </div>
              <div>
                <dt>復元内容</dt>
                <dd>
                  商品 {number(pending.backup.data.products.length)} 件 / タグ{' '}
                  {number(pending.backup.data.tags.length)} 件<br />
                  ロット {number(pending.backup.data.stockLots.length)} 件 / 履歴{' '}
                  {number(pending.backup.data.stockTransactions.length)} 件
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="button secondary w-full"
              onClick={backup}
              disabled={action.busy}
            >
              <Icon name="download" size={17} />
              現在のデータをバックアップ
            </button>
          </div>
        ) : backupOpen ? (
          <>
            <div className="menu-options">
              <button
                ref={backupSave}
                className="menu-option"
                onClick={backup}
                disabled={action.busy}
              >
                <Icon name="download" />
                <span>
                  バックアップを保存<small>すべてのデータをJSONでダウンロード</small>
                </span>
                <Icon name="arrow" size={15} />
              </button>
              <button
                className="menu-option"
                onClick={() => fileInput.current?.click()}
                disabled={action.busy}
              >
                <Icon name="upload" />
                <span>
                  バックアップから復元<small>ファイルを確認してからデータを置き換え</small>
                </span>
                <Icon name="arrow" size={15} />
              </button>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="button secondary w-full"
                disabled={action.busy}
                onClick={() => {
                  setBackupOpen(false)
                  action.setError('')
                }}
              >
                メニューに戻る
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="menu-section-label">データの管理</p>
            <p className="field-help">在庫データはこの端末に自動保存されます。</p>
            <div className="menu-options">
              <button className="menu-option" onClick={onManageTags} disabled={action.busy}>
                <Icon name="tag" />
                <span>
                  タグを編集<small>名前の変更・削除</small>
                </span>
                <Icon name="arrow" size={15} />
              </button>
            </div>
            <PwaTools />
            <div className="backup-guidance">
              <p>在庫データをファイルに保存したり、保存したファイルから復元したりできます。</p>
              <button
                ref={backupEntry}
                type="button"
                className="button secondary w-full"
                onClick={() => setBackupOpen(true)}
                disabled={action.busy}
              >
                バックアップ連携する
              </button>
            </div>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="バックアップファイルを選択"
          className="sr-only"
          tabIndex={-1}
          onChange={readFile}
          disabled={action.busy}
        />
        {action.error && (
          <p className="error mt-4" role="alert">
            {action.error}
          </p>
        )}
        {action.busy && (
          <p className="field-help mt-3" role="status">
            処理しています…
          </p>
        )}
        {pending && (
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={action.busy}
              onClick={() => {
                setPending(undefined)
                action.setError('')
              }}
            >
              キャンセル
            </button>
            <button className="button danger" disabled={action.busy} onClick={restore}>
              すべて置き換えて復元
            </button>
          </div>
        )}
      </div>
    </Dialog>
  )
}

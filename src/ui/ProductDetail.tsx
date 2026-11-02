import { useState } from 'react'
import type { ProductSummary, StockLot, StockTransaction, Tag } from '../domain/models'
import { sortLots } from '../domain/selectors'
import { lotExpirationStatus } from '../domain/expiration'
import { stockIntervals } from '../domain/intervals'
import { navigate } from './routing'
import { dateTime, expiration, number } from './format'
import { useToday } from './hooks'
import Icon from './Icon'
import StockDialog from './StockDialog'
import DeleteProduct from './DeleteProduct'
import ScrollList from './ScrollList'
import TransactionEdit from './TransactionEdit'

export default function ProductDetail({
  product,
  tags,
  lots,
  transactions,
  onSaved,
}: {
  product: ProductSummary
  tags: Tag[]
  lots: StockLot[]
  transactions: StockTransaction[]
  onSaved: (message: string) => void
}) {
  const [mode, setMode] = useState<'in' | 'out'>()
  const [editing, setEditing] = useState<StockTransaction>()
  const currentDate = useToday()
  const sortedLots = sortLots(lots)
  const intervals = stockIntervals(transactions)
  const averageDays = (days: number | null) => days === null ? 'まだありません' : `平均${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(days)}日`
  const history = [...transactions].sort(
    (a, b) => b.operatedAt.localeCompare(a.operatedAt) || b.id.localeCompare(a.id),
  )
  return (
    <section>
      <button className="button secondary detail-back" onClick={() => navigate('/')}>
        <Icon name="back" size={18} />
        在庫一覧に戻る
      </button>
      <div className="page-heading detail-heading">
        <div>
          <p className="eyebrow">ITEM DETAILS</p>
          <h1>{product.name}</h1>
          {!!product.aliases?.length && <p className="product-aliases">別名：{product.aliases.join('、')}</p>}
          <div className="product-tags">
            {product.tags.map((tag) => (
              <span key={tag.id} className="tag-label">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
        <button
          className="button secondary shrink-0"
          onClick={() => navigate(`/products/${product.id}/edit`)}
        >
          <Icon name="edit" size={17} />
          編集
        </button>
      </div>
      <div className="detail-summary">
        <div>
          <p className="field-help">いまある在庫</p>
          <p className="detail-total" aria-label={`合計在庫 ${product.total} 個`}>
            {number(product.total)}
            <span>個</span>
          </p>
          <p className="field-help">最終操作 {dateTime(product.lastOperatedAt)}</p>
        </div>
        <div className="stock-actions">
          <button
            className="button primary"
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true })
              setMode('in')
            }}
          >
            <Icon name="plus" />
            入庫する
          </button>
          <button
            className="button secondary"
            disabled={product.total === 0}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true })
              setMode('out')
            }}
          >
            <Icon name="minus" />
            出庫する
          </button>
        </div>
      </div>
      <div className="list-heading">
        <h2>
          期限別の在庫 <span>{lots.length} ロット</span>
        </h2>
        <span>期限が近い順・残数0は末尾</span>
      </div>
      <ScrollList label="期限別在庫の一覧">
        <div className="panel lot-list">
          {sortedLots.length === 0 ? (
            <p className="section-empty">在庫はまだありません。「入庫する」から追加できます。</p>
          ) : (
            sortedLots.map((lot) => {
              const status = lotExpirationStatus(lot, currentDate)
              return (
                <div key={lot.id} className={`lot-row ${status.kind}`}>
                  <span className="lot-marker" />
                  <div className="lot-info">
                    <strong>{expiration(lot.expirationType, lot.expirationDate)}</strong>
                    {status.label && <span className="lot-status-label">{status.label}</span>}
                  </div>
                  <span className="stock-count">
                    <strong>{number(lot.quantity)}</strong>
                    <small>個</small>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </ScrollList>
      <div className="list-heading history-heading">
        <h2>
          入出庫の履歴 <span>{transactions.length} 件</span>
        </h2>
        <span>新しい順</span>
      </div>
      <div className="interval-summary">
        <span>入庫間隔：<strong>{averageDays(intervals.incoming)}</strong></span>
        <span>出庫間隔：<strong>{averageDays(intervals.outgoing)}</strong></span>
      </div>
      <p className="field-help mb-3">
        同日の操作はまとめて計算します（初期在庫を含む）。記録が1日分の場合と初日の履歴は、1日として表示します。
      </p>
      <ScrollList label="入出庫履歴の一覧">
        <div className="panel history-list">
          {history.length === 0 ? (
            <p className="section-empty">入庫・出庫すると、ここに記録されます。</p>
          ) : (
            history.map((tx) => (
              <div className="history-row" key={tx.id}>
                <span className={`history-icon ${tx.quantityChange < 0 ? 'out' : ''}`}>
                  <Icon name={tx.quantityChange > 0 ? 'plus' : 'minus'} size={17} />
                </span>
                <div className="history-info">
                  <div className="history-title">
                    <strong>{tx.quantityChange > 0 ? '入庫' : '出庫'}</strong>
                    <time dateTime={tx.operatedAt}>{dateTime(tx.operatedAt)}</time>
                  </div>
                  <p>{expiration(tx.expirationTypeSnapshot, tx.expirationDateSnapshot)}</p>
                  {intervals.gaps.has(tx.id) && (
                    <p className="history-interval">
                      {intervals.firstDayIds.has(tx.id)
                        ? `${tx.quantityChange > 0 ? '入庫' : '出庫'}初日：1日`
                        : `前回の${tx.quantityChange > 0 ? '入庫' : '出庫'}日から${number(intervals.gaps.get(tx.id)!)}日`}
                    </p>
                  )}
                  {tx.memo && <p className="memo">{tx.memo}</p>}
                </div>
                <strong className={`quantity-change ${tx.quantityChange < 0 ? 'out' : ''}`}>
                  {tx.quantityChange > 0 ? '+' : '−'}
                  {number(Math.abs(tx.quantityChange))}
                </strong>
                <button className="icon-button history-edit" aria-label={`この${tx.quantityChange > 0 ? '入庫' : '出庫'}履歴を編集`}
                  onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); setEditing(tx) }}>
                  <Icon name="edit" size={17} />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollList>
      <DeleteProduct
        product={product}
        lotCount={lots.length}
        transactionCount={transactions.length}
        onSaved={onSaved}
      />
      {editing && <TransactionEdit key={editing.id} product={product} transaction={editing} lots={lots}
        onClose={() => setEditing(undefined)} onSaved={onSaved} />}
      {mode && (
        <StockDialog
          mode={mode}
          product={product}
          lots={lots}
          tags={tags}
          onClose={() => setMode(undefined)}
          onSaved={onSaved}
        />
      )}
    </section>
  )
}

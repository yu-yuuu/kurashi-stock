import type { ProductSummary, StockLot } from '../domain/models'
import { lotExpirationStatus } from '../domain/expiration'
import { sortLots } from '../domain/selectors'
import { expiration, number } from './format'
import { useToday } from './hooks'
import { navigate } from './routing'
import Icon from './Icon'
import ScrollList from './ScrollList'

export default function ExpiringStock({
  products,
  lots,
}: {
  products: ProductSummary[]
  lots: StockLot[]
}) {
  const currentDate = useToday()
  const names = new Map(products.map((product) => [product.id, product.name]))
  const expiring = sortLots(lots).flatMap((lot) => {
    const status = lotExpirationStatus(lot, currentDate)
    const name = names.get(lot.productId)
    return name !== undefined && ['expired', 'due-today', 'due-soon'].includes(status.kind)
      ? [{ lot, status, name }]
      : []
  })
  if (expiring.length === 0) return null
  function row({ lot, status, name }: (typeof expiring)[number]) {
    return (
      <li key={lot.id}>
        <button
          className={`expiring-row lot-row ${status.kind}`}
          onClick={() => navigate(`/products/${lot.productId}`)}
        >
          <span className="lot-marker" />
          <span className="lot-info">
            <strong>{name}</strong>
            <span className="expiring-date">{expiration(lot.expirationType, lot.expirationDate)}</span>
            <span className="lot-status-label">{status.label}</span>
          </span>
          <span className="stock-count">
            <strong>{number(lot.quantity)}</strong><small>個</small>
          </span>
          <Icon name="arrow" size={16} />
        </button>
      </li>
    )
  }
  return (
    <section className="expiring-stock" aria-labelledby="expiring-heading">
      <div className="expiring-heading">
        <span className="summary-icon">
          <Icon name="clock" size={23} />
        </span>
        <div>
          <h2 id="expiring-heading">
            期限が近い在庫 <span>{number(expiring.length)} ロット</span>
          </h2>
          <p>7日以内・期限切れを、期限が近い順に表示</p>
        </div>
      </div>
      <ScrollList label="期限注意の一覧">
        <ul className="expiring-list">{expiring.map(row)}</ul>
      </ScrollList>
    </section>
  )
}

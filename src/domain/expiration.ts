import type { StockLot } from './models'

export const EXPIRATION_WARNING_DAYS = 7
export type LotStatus = 'normal' | 'depleted' | 'expired' | 'due-today' | 'due-soon'

export function lotExpirationStatus(
  lot: Pick<StockLot, 'quantity' | 'expirationDate'>,
  currentDate: string,
): { kind: LotStatus; label: string } {
  if (lot.quantity === 0) return { kind: 'depleted', label: '使い切りました' }
  if (!lot.expirationDate) return { kind: 'normal', label: '' }
  // Calendar dates, rather than local elapsed hours, keep the boundary stable across DST.
  const days =
    (Date.parse(`${lot.expirationDate}T00:00:00Z`) - Date.parse(`${currentDate}T00:00:00Z`)) /
    86_400_000
  if (days < 0) return { kind: 'expired', label: '期限日を過ぎています' }
  if (days === 0) return { kind: 'due-today', label: '今日が期限です' }
  if (days <= EXPIRATION_WARNING_DAYS)
    return { kind: 'due-soon', label: `あと${days}日で期限です` }
  return { kind: 'normal', label: '' }
}

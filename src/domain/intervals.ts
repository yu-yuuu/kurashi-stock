import type { StockTransaction } from './models'

function calendarDay(timestamp: string) {
  const date = new Date(timestamp)
  const localDate = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return Date.parse(`${localDate}T00:00:00Z`) / 86_400_000
}

export function stockIntervals(transactions: StockTransaction[]) {
  const gaps = new Map<string, number>()
  const firstDayIds = new Set<string>()
  function average(incoming: boolean): number | null {
    const records = transactions.filter((tx) => (tx.quantityChange > 0) === incoming)
    const days = [...new Set(records.map((tx) => calendarDay(tx.operatedAt)))].sort((a, b) => a - b)
    const dayGaps = new Map(days.slice(1).map((day, index) => [day, day - days[index]]))
    for (const tx of records) {
      const day = calendarDay(tx.operatedAt)
      gaps.set(tx.id, dayGaps.get(day) ?? 1)
      if (day === days[0]) firstDayIds.add(tx.id)
    }
    if (days.length === 0) return null
    return days.length === 1 ? 1 : (days.at(-1)! - days[0]) / (days.length - 1)
  }
  const incoming = average(true)
  const outgoing = average(false)
  return { incoming, outgoing, gaps, firstDayIds }
}

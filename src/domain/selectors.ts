import type { InventoryData, ProductSummary, StockLot } from './models'
import { normalizeSearch } from './search'

export function summarize(data: InventoryData): ProductSummary[] {
  const tags = new Map(data.tags.map((tag) => [tag.id, tag]))
  return data.products
    .map((product) => ({
      ...product,
      tags: data.productTags
        .filter((link) => link.productId === product.id)
        .flatMap((link) => tags.get(link.tagId) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
      total: data.stockLots
        .filter((lot) => lot.productId === product.id)
        .reduce((sum, lot) => sum + lot.quantity, 0),
      lastOperatedAt:
        data.stockTransactions
          .filter((tx) => tx.productId === product.id)
          .reduce((latest, tx) => (tx.operatedAt > latest ? tx.operatedAt : latest), '') ||
        product.createdAt,
    }))
    .sort(
      (a, b) =>
        b.lastOperatedAt.localeCompare(a.lastOperatedAt) || a.name.localeCompare(b.name, 'ja'),
    )
}
export function filterProducts(products: ProductSummary[], search: string, tagIds: string[], mode: 'and' | 'or' = 'and') {
  const needle = normalizeSearch(search.trim())
  return products.filter(
    (product) =>
      [product.name, ...(product.aliases ?? [])].some((name) => normalizeSearch(name).includes(needle)) &&
      (tagIds.length === 0 || (mode === 'and' ? tagIds.every((id) => product.tags.some((tag) => tag.id === id)) : tagIds.some((id) => product.tags.some((tag) => tag.id === id)))),
  )
}
export function sortLots(lots: StockLot[]) {
  return [...lots].sort(
    (a, b) =>
      Number(a.quantity === 0) - Number(b.quantity === 0) ||
      (a.expirationDate ?? '9999-99-99').localeCompare(b.expirationDate ?? '9999-99-99') ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

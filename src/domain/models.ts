export const expirationLabels = {
  consume: '消費期限',
  best_before: '賞味期限',
  use_by: '使用期限',
  none: '期限なし',
} as const
export type ExpirationType = keyof typeof expirationLabels
export interface Product {
  id: string
  name: string
  aliases?: string[]
  createdAt: string
  updatedAt: string
}
export interface Tag {
  id: string
  name: string
}
export interface ProductTag {
  id: string
  productId: string
  tagId: string
}
export interface StockLot {
  id: string
  productId: string
  expirationType: ExpirationType
  expirationDate: string | null
  quantity: number
  createdAt: string
}
export interface StockTransaction {
  id: string
  productId: string
  lotId: string
  quantityChange: number
  operatedAt: string
  memo: string
  expirationTypeSnapshot: ExpirationType
  expirationDateSnapshot: string | null
}
export interface InventoryData {
  products: Product[]
  tags: Tag[]
  productTags: ProductTag[]
  stockLots: StockLot[]
  stockTransactions: StockTransaction[]
}
export interface StockInput {
  quantity: number
  expirationType: ExpirationType
  expirationDate: string | null
  memo: string
}
export interface ProductInput {
  name: string
  aliases?: string[]
  tagNames: string[]
  initialStock?: StockInput
}
export type TransactionEditInput = {
  quantity: number
  memo: string
  operatedAt: string
} & (
  | { direction: 'in'; expirationType: ExpirationType; expirationDate: string | null }
  | { direction: 'out'; lotId: string }
)
export interface ProductSummary extends Product {
  tags: Tag[]
  total: number
  lastOperatedAt: string
}
export const emptyInventory: InventoryData = {
  products: [],
  tags: [],
  productTags: [],
  stockLots: [],
  stockTransactions: [],
}

import Dexie, { type Table } from 'dexie'
import type { Product, ProductTag, StockLot, StockTransaction, Tag } from '../domain/models'

export class InventoryDatabase extends Dexie {
  products!: Table<Product, string>
  tags!: Table<Tag, string>
  productTags!: Table<ProductTag, string>
  stockLots!: Table<StockLot, string>
  stockTransactions!: Table<StockTransaction, string>
  constructor(name = 'kurashi-stock') {
    super(name)
    this.version(1).stores({
      products: 'id, name',
      tags: 'id, &name',
      productTags: 'id, productId, tagId, &[productId+tagId]',
      stockLots: 'id, productId',
      stockTransactions: 'id, productId, lotId, operatedAt',
    })
  }
}
export const db = new InventoryDatabase()

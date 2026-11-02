import type { InventoryData, ProductInput, StockInput, StockLot, StockTransaction, TransactionEditInput } from '../domain/models'
import {
  cleanName,
  cleanAliases,
  ensure,
  validateMemo,
  validateQuantity,
  validateStock,
  isValidDate,
} from '../domain/validation'
import { db, type InventoryDatabase } from './database'
import { createId } from '../platform/uuid'

export class InventoryService {
  constructor(readonly database: InventoryDatabase = db) {}
  async deleteProduct(id: string) {
    const d = this.database
    await d.transaction('rw', d.products, d.productTags, d.stockLots, d.stockTransactions, async () => {
      ensure(await d.products.get(id), '商品が見つかりません。一覧から選び直してください。')
      await d.stockTransactions.where('productId').equals(id).delete()
      await d.stockLots.where('productId').equals(id).delete()
      await d.productTags.where('productId').equals(id).delete()
      await d.products.delete(id)
    })
  }
  async createTag(value: string) {
    const name = cleanName(value, 'タグ名', 40)
    const d = this.database
    return d.transaction('rw', d.tags, async () => {
      ensure(!(await d.tags.where('name').equals(name).first()), '同じ名前のタグがあります。別の名前を入力してください。')
      const id = createId()
      await d.tags.add({ id, name })
      return id
    })
  }
  async renameTag(id: string, value: string) {
    const name = cleanName(value, 'タグ名', 40)
    const d = this.database
    await d.transaction('rw', d.tags, async () => {
      ensure(await d.tags.get(id), 'タグが見つかりません。選び直してください。')
      const existing = await d.tags.where('name').equals(name).first()
      ensure(
        !existing || existing.id === id,
        '同じ名前のタグがあります。別の名前を入力してください。',
      )
      await d.tags.update(id, { name })
    })
  }
  async deleteTag(id: string) {
    const d = this.database
    await d.transaction('rw', d.tags, d.productTags, async () => {
      ensure(await d.tags.get(id), 'タグが見つかりません。選び直してください。')
      await d.productTags.where('tagId').equals(id).delete()
      await d.tags.delete(id)
    })
  }
  async read(): Promise<InventoryData> {
    const d = this.database
    return d.transaction('r', d.tables, async () => ({
      products: await d.products.toArray(),
      tags: await d.tags.toArray(),
      productTags: await d.productTags.toArray(),
      stockLots: await d.stockLots.toArray(),
      stockTransactions: await d.stockTransactions.toArray(),
    }))
  }
  async saveProduct(input: ProductInput, id?: string) {
    const name = cleanName(input.name)
    const aliases = input.aliases === undefined ? undefined : cleanAliases(input.aliases)
    const names = [...new Set(input.tagNames.map((tag) => cleanName(tag, 'タグ名', 40)))]
    ensure(!id || !input.initialStock, '編集時の在庫変更は入庫・出庫から行ってください。')
    if (input.initialStock) validateStock(input.initialStock)
    const d = this.database
    return d.transaction('rw', d.tables, async () => {
      const now = new Date().toISOString()
      const productId = id ?? createId()
      if (id) {
        ensure(await d.products.get(id), '商品が見つかりません。一覧から選び直してください。')
        await d.products.update(id, { name, ...(aliases !== undefined ? { aliases } : {}), updatedAt: now })
      } else await d.products.add({ id: productId, name, aliases: aliases ?? [], createdAt: now, updatedAt: now })
      await this.replaceProductTags(productId, names)
      if (input.initialStock) await this.addStockInTransaction(productId, input.initialStock, now)
      return productId
    })
  }
  async stockIn(productId: string, input: StockInput) {
    validateStock(input)
    const d = this.database
    return d.transaction('rw', d.products, d.stockLots, d.stockTransactions, async () => {
      ensure(await d.products.get(productId), '商品が見つかりません。一覧から選び直してください。')
      return this.addStockInTransaction(productId, input, new Date().toISOString())
    })
  }
  private async addStockInTransaction(productId: string, input: StockInput, now: string) {
    const d = this.database
    // null is not an IndexedDB key: look up all product lots inside the serialized write transaction.
    const lots = await d.stockLots.where('productId').equals(productId).toArray()
    const total = lots.reduce((sum, lot) => sum + lot.quantity, 0)
    ensure(
      Number.isSafeInteger(total + input.quantity),
      '在庫数が大きすぎます。数量を減らしてください。',
    )
    let lot = lots.find(
      (lot) =>
        lot.expirationType === input.expirationType && lot.expirationDate === input.expirationDate,
    )
    if (lot) {
      lot = { ...lot, quantity: lot.quantity + input.quantity }
      await d.stockLots.put(lot)
    } else {
      lot = {
        id: createId(),
        productId,
        expirationType: input.expirationType,
        expirationDate: input.expirationDate,
        quantity: input.quantity,
        createdAt: now,
      }
      await d.stockLots.add(lot)
    }
    await this.record(lot, input.quantity, input.memo, now)
    await d.products.update(productId, { updatedAt: now })
    return lot.id
  }
  async stockOut(productId: string, lotId: string, quantity: number, memo: string, tagNames?: string[]) {
    validateQuantity(quantity)
    validateMemo(memo)
    const names = tagNames === undefined ? undefined : [...new Set(tagNames.map((tag) => cleanName(tag, 'タグ名', 40)))]
    const d = this.database
    return d.transaction('rw', d.products, d.stockLots, d.stockTransactions, d.tags, d.productTags, async () => {
      ensure(await d.products.get(productId), '商品が見つかりません。一覧から選び直してください。')
      const lot = await d.stockLots.get(lotId)
      ensure(lot && lot.productId === productId, '出庫するロットを選択してください。')
      ensure(
        lot.quantity >= quantity,
        `選択したロットの残数（${lot.quantity}個）を超える出庫はできません。`,
      )
      const now = new Date().toISOString()
      await d.stockLots.update(lotId, { quantity: lot.quantity - quantity })
      await this.record(lot, -quantity, memo, now)
      if (names !== undefined) await this.replaceProductTags(productId, names)
      await d.products.update(productId, { updatedAt: now })
    })
  }
  async editTransaction(id: string, input: TransactionEditInput, expected: StockTransaction) {
    validateQuantity(input.quantity)
    validateMemo(input.memo)
    ensure(input.direction === 'in' || input.direction === 'out', '入庫・出庫を選択してください。')
    if (input.direction === 'in') validateStock(input)
    ensure(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.operatedAt) &&
      isValidDate(input.operatedAt.slice(0, 10)) && Number.isFinite(Date.parse(input.operatedAt)) &&
      new Date(input.operatedAt).toISOString() === input.operatedAt,
      '有効な操作日時を入力してください。',
    )
    const d = this.database
    await d.transaction('rw', d.products, d.stockLots, d.stockTransactions, async () => {
      const original = await d.stockTransactions.get(id)
      ensure(original, '履歴が見つかりません。商品詳細から選び直してください。')
      ensure(
        (Object.keys(original) as (keyof StockTransaction)[]).every((key) => original[key] === expected[key]),
        'この履歴は別の操作で変更されています。閉じて選び直してください。',
      )
      ensure(await d.products.get(original.productId), '商品が見つかりません。')
      const lots = await d.stockLots.where('productId').equals(original.productId).toArray()
      ensure(lots.some((lot) => lot.id === original.lotId), '元のロットが見つかりません。')
      let target: StockLot | undefined
      if (input.direction === 'out') {
        target = lots.find((lot) => lot.id === input.lotId)
        ensure(target, 'この商品の出庫するロットを選択してください。')
      } else {
        target = lots.find((lot) => lot.expirationType === input.expirationType && lot.expirationDate === input.expirationDate)
        if (!target) {
          target = { id: createId(), productId: original.productId, quantity: 0,
            expirationType: input.expirationType, expirationDate: input.expirationDate, createdAt: input.operatedAt }
          lots.push(target)
        }
      }
      const updated: StockTransaction = { ...original, lotId: target.id,
        quantityChange: input.direction === 'in' ? input.quantity : -input.quantity,
        operatedAt: input.operatedAt, memo: input.memo.trim(),
        expirationTypeSnapshot: target.expirationType, expirationDateSnapshot: target.expirationDate }
      const history = (await d.stockTransactions.where('productId').equals(original.productId).toArray())
        .map((tx) => tx.id === id ? updated : tx)
      // Rebuild balances using exact integers before any write; snapshots and lot balances commit together.
      const balances = new Map(lots.map((lot) => [lot.id, 0n]))
      for (const tx of history) {
        ensure(balances.has(tx.lotId), '履歴の対象ロットが見つかりません。')
        balances.set(tx.lotId, balances.get(tx.lotId)! + BigInt(tx.quantityChange))
      }
      let total = 0n
      for (const balance of balances.values()) {
        ensure(balance >= 0n, '修正すると在庫が不足します。数量や対象ロットを確認してください。')
        ensure(balance <= BigInt(Number.MAX_SAFE_INTEGER), '在庫数が大きすぎます。数量を減らしてください。')
        total += balance
      }
      ensure(total <= BigInt(Number.MAX_SAFE_INTEGER), '商品の合計在庫数が大きすぎます。')
      for (const lot of lots) {
        if (lot.id === original.lotId && lot.id !== target.id && !history.some((tx) => tx.lotId === lot.id)) {
          await d.stockLots.delete(lot.id)
        } else if (lot.quantity !== Number(balances.get(lot.id)) || lot.id === target.id) {
          await d.stockLots.put({ ...lot, quantity: Number(balances.get(lot.id)) })
        }
      }
      await d.stockTransactions.put(updated)
      await d.products.update(original.productId, { updatedAt: new Date().toISOString() })
    })
  }
  private async replaceProductTags(productId: string, names: string[]) {
    const d = this.database
    await d.productTags.where('productId').equals(productId).delete()
    for (const name of names) {
      let tag = await d.tags.where('name').equals(name).first()
      if (!tag) {
        tag = { id: createId(), name }
        await d.tags.add(tag)
      }
      await d.productTags.add({ id: `${productId}:${tag.id}`, productId, tagId: tag.id })
    }
  }
  private async record(lot: StockLot, quantityChange: number, memo: string, operatedAt: string) {
    await this.database.stockTransactions.add({
      id: createId(),
      productId: lot.productId,
      lotId: lot.id,
      quantityChange,
      operatedAt,
      memo: memo.trim(),
      expirationTypeSnapshot: lot.expirationType,
      expirationDateSnapshot: lot.expirationDate,
    })
  }
}
export const inventory = new InventoryService()

import type {
  InventoryData,
  Product,
  ProductTag,
  StockLot,
  StockTransaction,
  Tag,
} from '../domain/models'
import {
  cleanName,
  cleanAliases,
  ensure,
  isValidDate,
  validateExpiration,
  validateMemo,
  ValidationError,
} from '../domain/validation'
import { db, type InventoryDatabase } from './database'
import { InventoryService } from './inventory'

export interface Backup {
  app: 'kurashi-stock'
  version: 2
  exportedAt: string
  data: InventoryData
}
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
function object(value: unknown): Record<string, unknown> {
  ensure(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'バックアップのデータ形式が正しくありません。',
  )
  return value as Record<string, unknown>
}
function text(value: unknown, label: string) {
  ensure(typeof value === 'string', `${label}の形式が正しくありません。`)
  return value
}
function uuid(value: unknown) {
  const id = text(value, 'ID')
  ensure(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    'IDがUUID形式ではありません。',
  )
  return id
}
function timestamp(value: unknown) {
  const time = text(value, '日時')
  ensure(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(time) &&
      isValidDate(time.slice(0, 10)) &&
      Number.isFinite(Date.parse(time)) &&
      new Date(time).toISOString() === time,
    '日時の形式が正しくありません。',
  )
  return time
}
function name(value: unknown, label: string, max: number) {
  const raw = text(value, label)
  ensure(cleanName(raw, label, max) === raw, `${label}の前後に空白があります。`)
  return raw
}
function rows<T extends { id: string }>(
  value: unknown,
  parse: (row: Record<string, unknown>) => T,
): T[] {
  ensure(Array.isArray(value), '必要なテーブルがないか、配列ではありません。')
  const result = value.map((row) => parse(object(row)))
  ensure(
    new Set(result.map((row) => row.id)).size === result.length,
    '同じIDのレコードが重複しています。',
  )
  return result
}
export function validateBackup(value: unknown): Backup {
  const root = object(value)
  ensure(
    root.app === 'kurashi-stock' && (root.version === 1 || root.version === 2),
    'このアプリに対応したバージョン1または2のバックアップを選択してください。',
  )
  const exportedAt = timestamp(root.exportedAt)
  const raw = object(root.data)
  const products = rows<Product>(raw.products, (row) => ({
    id: uuid(row.id),
    name: name(row.name, '商品名', 120),
    aliases: root.version === 1 && row.aliases === undefined ? [] : cleanAliases(row.aliases),
    createdAt: timestamp(row.createdAt),
    updatedAt: timestamp(row.updatedAt),
  }))
  const tags = rows<Tag>(raw.tags, (row) => ({
    id: uuid(row.id),
    name: name(row.name, 'タグ名', 40),
  }))
  const productTags = rows<ProductTag>(raw.productTags, (row) => ({
    id: text(row.id, '商品タグID'),
    productId: uuid(row.productId),
    tagId: uuid(row.tagId),
  }))
  const stockLots = rows<StockLot>(raw.stockLots, (row) => {
    validateExpiration(row.expirationType, row.expirationDate)
    ensure(
      typeof row.quantity === 'number' && Number.isSafeInteger(row.quantity) && row.quantity >= 0,
      'ロットの数量は0以上の整数である必要があります。',
    )
    return {
      id: uuid(row.id),
      productId: uuid(row.productId),
      expirationType: row.expirationType,
      expirationDate: row.expirationDate as string | null,
      quantity: row.quantity,
      createdAt: timestamp(row.createdAt),
    }
  })
  const stockTransactions = rows<StockTransaction>(raw.stockTransactions, (row) => {
    validateExpiration(row.expirationTypeSnapshot, row.expirationDateSnapshot)
    ensure(
      typeof row.quantityChange === 'number' &&
        Number.isSafeInteger(row.quantityChange) &&
        row.quantityChange !== 0,
      '履歴の増減数は0以外の整数である必要があります。',
    )
    const memo = text(row.memo, 'メモ')
    validateMemo(memo)
    return {
      id: uuid(row.id),
      productId: uuid(row.productId),
      lotId: uuid(row.lotId),
      quantityChange: row.quantityChange,
      operatedAt: timestamp(row.operatedAt),
      memo,
      expirationTypeSnapshot: row.expirationTypeSnapshot,
      expirationDateSnapshot: row.expirationDateSnapshot as string | null,
    }
  })
  const productIds = new Set(products.map((product) => product.id))
  const tagIds = new Set(tags.map((tag) => tag.id))
  const lotMap = new Map(stockLots.map((lot) => [lot.id, lot]))
  ensure(new Set(tags.map((tag) => tag.name)).size === tags.length, 'タグ名が重複しています。')
  for (const link of productTags) {
    ensure(
      productIds.has(link.productId) && tagIds.has(link.tagId),
      '商品タグの参照先が存在しません。',
    )
    ensure(link.id === `${link.productId}:${link.tagId}`, '商品タグIDの形式が正しくありません。')
  }
  const lotKeys = new Set<string>()
  const totals = new Map<string, bigint>()
  for (const lot of stockLots) {
    ensure(productIds.has(lot.productId), 'ロットの参照先商品が存在しません。')
    const key = JSON.stringify([lot.productId, lot.expirationType, lot.expirationDate])
    ensure(!lotKeys.has(key), '同一商品・同一期限のロットが重複しています。')
    lotKeys.add(key)
    totals.set(lot.productId, (totals.get(lot.productId) ?? 0n) + BigInt(lot.quantity))
  }
  ensure(
    [...totals.values()].every((total) => total <= BigInt(Number.MAX_SAFE_INTEGER)),
    '商品の合計在庫数が大きすぎます。',
  )
  const balances = new Map<string, bigint>()
  for (const tx of stockTransactions) {
    const lot = lotMap.get(tx.lotId)
    ensure(
      productIds.has(tx.productId) && lot && lot.productId === tx.productId,
      '履歴の参照先商品・ロットが一致しません。',
    )
    ensure(
      tx.expirationTypeSnapshot === lot.expirationType &&
        tx.expirationDateSnapshot === lot.expirationDate,
      '履歴とロットの期限情報が一致しません。',
    )
    balances.set(tx.lotId, (balances.get(tx.lotId) ?? 0n) + BigInt(tx.quantityChange))
  }
  for (const lot of stockLots)
    ensure(
      (balances.get(lot.id) ?? 0n) === BigInt(lot.quantity),
      '履歴の合計とロットの残数が一致しません。',
    )
  return {
    app: 'kurashi-stock',
    version: 2,
    exportedAt,
    data: { products, tags, productTags, stockLots, stockTransactions },
  }
}
export function parseBackup(json: string) {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new ValidationError(
      'JSONファイルを読み取れません。正しいバックアップを選択してください。',
    )
  }
  return validateBackup(value)
}
export async function exportBackup(database: InventoryDatabase = db): Promise<Backup> {
  const data = await new InventoryService(database).read()
  return {
    app: 'kurashi-stock',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: { ...data, products: data.products.map((product) => ({ ...product, aliases: product.aliases ?? [] })) },
  }
}
export async function restoreBackup(value: unknown, database: InventoryDatabase = db) {
  // Validate and copy first. Every table replacement then commits or rolls back together.
  const { data } = validateBackup(value)
  await database.transaction('rw', database.tables, async () => {
    for (const table of database.tables) await table.clear()
    await database.products.bulkAdd(data.products)
    await database.tags.bulkAdd(data.tags)
    await database.productTags.bulkAdd(data.productTags)
    await database.stockLots.bulkAdd(data.stockLots)
    await database.stockTransactions.bulkAdd(data.stockTransactions)
  })
}

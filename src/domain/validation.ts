import { expirationLabels, type ExpirationType, type StockInput } from './models'
import { normalizeSearch } from './search'

export function cleanAliases(value: unknown): string[] {
  ensure(Array.isArray(value) && value.every((alias) => typeof alias === 'string'), '別名は文字列の一覧で指定してください。')
  ensure(value.length <= 10, '検索用の別名は10個まで登録できます。')
  const seen = new Set<string>()
  return value.map((alias) => cleanName(alias, '別名', 80)).filter((alias) => {
    const key = normalizeSearch(alias)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export class ValidationError extends Error {}
export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ValidationError(message)
}
export function cleanName(value: string, label = '商品名', max = 120) {
  const name = value.trim()
  ensure(name.length > 0, `${label}を入力してください。`)
  ensure(name.length <= max, `${label}は${max}文字以内で入力してください。`)
  return name
}
export function validateQuantity(quantity: number) {
  ensure(Number.isSafeInteger(quantity) && quantity > 0, '数量は1以上の整数で入力してください。')
}
export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
    return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function validateExpiration(type: unknown, date: unknown): asserts type is ExpirationType {
  ensure(
    typeof type === 'string' && Object.hasOwn(expirationLabels, type),
    '期限種別を選択してください。',
  )
  ensure(
    type === 'none' ? date === null : isValidDate(date),
    type === 'none' ? '期限なしの日付は空にしてください。' : '有効な期限日を入力してください。',
  )
}
export function validateStock(input: StockInput) {
  validateQuantity(input.quantity)
  validateExpiration(input.expirationType, input.expirationDate)
  validateMemo(input.memo)
}
export function validateMemo(memo: string) {
  ensure(memo.length <= 1000, 'メモは1000文字以内で入力してください。')
}
export function errorMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message
  if (error instanceof Error && /quota/i.test(error.name + error.message))
    return '端末の保存容量が不足しています。不要なファイルを整理して再度お試しください。'
  return 'データを処理できませんでした。ブラウザの保存機能と空き容量を確認し、再度お試しください。'
}

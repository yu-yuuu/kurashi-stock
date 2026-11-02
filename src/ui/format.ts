import { expirationLabels, type ExpirationType } from '../domain/models'
export const number = (value: number | bigint) => new Intl.NumberFormat('ja-JP').format(value)
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
export function expiration(type: ExpirationType, date: string | null) {
  return type === 'none'
    ? expirationLabels.none
    : `${expirationLabels[type]} ${date?.replaceAll('-', '/')}`
}
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

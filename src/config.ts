export function externalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}
export const appConfig = {
  feedbackUrl: externalUrl(import.meta.env.VITE_FEEDBACK_URL),
  privacyUrl: externalUrl(import.meta.env.VITE_PRIVACY_POLICY_URL),
}

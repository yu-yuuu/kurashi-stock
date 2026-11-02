export type Route = { page: 'list' } | { page: 'new' } | { page: 'detail' | 'edit'; id: string }

export function parseRoute(hash: string): Route {
  if (hash === '#/new') return { page: 'new' }
  const match = /^#\/products\/([^/]+)(\/edit)?$/.exec(hash)
  if (match) {
    try {
      return { page: match[2] ? 'edit' : 'detail', id: decodeURIComponent(match[1]) }
    } catch {
      return { page: 'list' }
    }
  }
  return { page: 'list' }
}

export function navigate(path: string) {
  window.location.hash = path
}

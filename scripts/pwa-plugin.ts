import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

// Precache only this build's app shell. Inventory remains exclusively in IndexedDB.
export function pwaPlugin(): Plugin {
  let publicDir = ''
  return {
    name: 'kurashi-stock-pwa',
    apply: 'build',
    configResolved(config) { publicDir = config.publicDir },
    async generateBundle(_, bundle) {
      const publicFiles = ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest']
      const files = ['index.html', ...publicFiles,
        ...Object.keys(bundle).filter(name => /\.(js|css)$/.test(name))]
      const hash = createHash('sha256').update(Object.values(bundle).map(item =>
        item.type === 'chunk' ? item.code : String(item.source)).join(''))
      for (const file of publicFiles) hash.update(await readFile(resolve(publicDir, file)))
      const version = hash.digest('hex').slice(0, 16)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const PREFIX = 'kurashi-stock-pwa:' + self.registration.scope + '|';
const CACHE = PREFIX + ${JSON.stringify(version)};
const FILES = ${JSON.stringify(files)}.map(file => new URL(file, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;
  // Never cache external analytics, user data, or arbitrary requests.
  const target = request.mode === 'navigate'
    ? new URL('index.html', self.registration.scope).href : url.href;
  if (!FILES.includes(target)) return;
  event.respondWith(caches.open(CACHE).then(async cache =>
    (await cache.match(target)) || fetch(request)));
});
` })
    },
  }
}

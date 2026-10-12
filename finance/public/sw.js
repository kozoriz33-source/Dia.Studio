// Простой service worker: оболочка приложения кэшируется для работы офлайн.
const CACHE = 'finance-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.json'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  // Навигация: сеть, при неудаче — кэшированная оболочка
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./')))
    return
  }
  // Остальное (js/css/шрифты/иконки): кэш, затем сеть с докэшированием
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})

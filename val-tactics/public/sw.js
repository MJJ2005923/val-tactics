/**
 * T教练 Service Worker — 自毁模式
 * 清理所有旧缓存后注销自己，避免缓存导致白屏
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map(k => caches.delete(k)))
    }).then(() => {
      // 注销所有 SW
      return self.registration.unregister()
    })
  )
})

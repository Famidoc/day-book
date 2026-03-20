const CACHE_NAME = 'minimal-expense-v1';

// 攔聽安裝事件
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 攔聽啟動事件
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 簡單的攔截請求 (為了讓 Chrome 判定這是一個合法的 PWA)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
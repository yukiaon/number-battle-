// バージョンを上げると古いキャッシュが破棄される
const CACHE_NAME = 'numbattle-v3';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Firebase は絶対キャッシュしない（リアルタイム性が必要）
  if (url.host.includes('firebaseio.com') || url.host.includes('firebasedatabase.app') || url.host.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 全リソースで「ネット優先・失敗時のみキャッシュ」戦略
  // これでアップデートが反映されやすくなる（オフラインフォールバックは保持）
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

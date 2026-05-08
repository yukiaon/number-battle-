// バージョンを上げると全クライアントが新しいキャッシュを取得し直します
const CACHE_NAME = 'numbattle-v1';

// オフラインで動かすためにキャッシュしたいファイル
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

  // Firebase, CDN, fonts などは常にネットワーク優先（リアルタイム性が必要）
  const isThirdParty = url.origin !== location.origin;
  // Firebase の Realtime Database は絶対キャッシュしない
  const isFirebase = url.host.includes('firebaseio.com') || url.host.includes('firebasedatabase.app') || url.host.includes('googleapis.com');

  if (isFirebase) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isThirdParty) {
    // CDN（React, Tailwind, Babel, fonts）はネットワーク優先＋キャッシュフォールバック
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 自分のオリジン（GitHub Pages 上のファイル）はキャッシュ優先
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
        return res;
      });
    })
  );
});

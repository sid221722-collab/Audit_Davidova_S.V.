const CACHE_NAME = 'audit-pwa-v47';
const APP_SHELL = ['./', './index.html', './app-config.js', './manifest.webmanifest', './service-worker.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
  } catch (e) {
    return;
  }

  // Для самой страницы используем network-first: при наличии интернета
  // новая версия интерфейса появляется сразу, а офлайн остаётся fallback из кэша.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Остальные локальные ресурсы — cache-first для полноценной офлайн-работы.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

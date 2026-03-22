const CACHE_VERSION = 'v1774198099597';
const CACHE_NAME = `app-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname === '/' ||
      url.pathname === '/index.html' ||
      url.pathname.startsWith('/chat') ||
      url.pathname.startsWith('/register-name') ||
      url.pathname.startsWith('/welcome') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/getpdf/') ||
      url.pathname.startsWith('/download-pdf/') ||
      url.pathname.startsWith('/session/') ||
      url.pathname.startsWith('/api/') ||
      url.pathname === '/seed-fixture-session') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        if (request.method === 'GET' && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }))
      .catch(() => caches.match('/index.html'))
  );
});

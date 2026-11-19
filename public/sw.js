// KidZ Zone service worker: network first for pages, cache first for built assets, pictures and map data,
// so the app keeps working offline after a visit.
const CACHE = 'kidzzone-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg']))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  const asset = /^\/(assets|garden|money|maps|icons)\//.test(url.pathname);
  if (asset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })));
  } else {
    e.respondWith(fetch(req).then((res) => { if (res.ok && req.mode === 'navigate') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); } return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match('/'))));
  }
});

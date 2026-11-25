// KidZ Zone service worker. Repeat visits open instantly: the page shell comes from the cache at once and is
// refreshed in the background (stale-while-revalidate); built assets, pictures and map data are cache-first
// (their names change when they change). If a new version's chunk is missing, the app reloads itself (main.tsx).
const CACHE = 'kidzzone-v3';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg']))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  const asset = /^\/(assets|garden|money|maps|icons|art3d|shell|pets|shop)\//.test(url.pathname);
  if (asset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })));
  } else if (req.mode === 'navigate') {
    const fresh = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); } return res; });
    e.waitUntil(fresh.catch(() => {}));
    e.respondWith(caches.match('/').then((hit) => hit || fresh).catch(() => fresh));
  } else {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});

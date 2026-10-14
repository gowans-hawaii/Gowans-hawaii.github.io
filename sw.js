/* Keeps the trip page working with no service.
   Upload this file next to index.html. */
const VERSION = 'hawaii-v1';
const STATE = 'hawaii-trip-state';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== STATE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Try the network, but give up after a few seconds on weak ship Wi-Fi */
function networkFirst(req){
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 4000));
  return Promise.race([fetch(req), timeout])
    .then(res => {
      if (res && res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })
    .catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match('./index.html')));
}

function cacheFirst(req){
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if ((req.headers.get('accept') || '').includes('text/event-stream')) return;
  if (url.hostname.endsWith('firebaseio.com')) return;
  if (req.mode === 'navigate' || url.origin === self.location.origin){ e.respondWith(networkFirst(req)); return; }
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com') || url.hostname === 'router.project-osrm.org'){
    e.respondWith(cacheFirst(req));
  }
});

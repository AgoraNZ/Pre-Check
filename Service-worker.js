const CACHE_NAME = 'agora-precheck-v8';
const urlsToCache = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://firebasestorage.googleapis.com/v0/b/dairy-farm-record-system.appspot.com/o/Agora%20Logo%2F2F6-1YdaEP.jpeg?alt=media'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async ()=>{
    const names = await caches.keys();
    await Promise.all(names.map(n => n !== CACHE_NAME && caches.delete(n)));
    await self.clients.claim();
  })());
});

// Don’t cache farm JSON: always network
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isFarmJson = url.href.includes('/o/Pre%20Check%2F') && url.search.includes('alt=media');

  if (isFarmJson) {
    event.respondWith(fetch(req).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}})));
    return;
  }
  // Static assets cache-first
  if (req.method==='GET' && (url.origin===location.origin || urlsToCache.some(u=>url.href.startsWith(u)))) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp=>{
        const copy = resp.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy)); return resp;
      })).catch(()=>caches.match('./index.html'))
    );
    return;
  }
  // Default network-first
  event.respondWith(
    fetch(req).then(resp=>{
      if (req.method==='GET' && resp && resp.status===200) {
        const copy = resp.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy));
      }
      return resp;
    }).catch(()=>caches.match(req))
  );
});
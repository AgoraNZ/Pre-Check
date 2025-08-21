// Bump when releasing
const CACHE_NAME = 'agora-form-cache-v56';

// Shell/assets for offline UI
const urlsToCache = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  // logo fallback (brochure header)
  'https://firebasestorage.googleapis.com/v0/b/dairy-farm-record-system.appspot.com/o/Agora%20Logo%2F6-1YdaEP.jpeg?alt=media'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async()=>{
      const names = await caches.keys();
      await Promise.all(names.map(n => n!==CACHE_NAME ? caches.delete(n) : null));
      await self.clients.claim();
    })()
  );
});

// Strategy:
// - Pre Check/*.json → network-first; on success cache; offline → serve cached JSON.
// - Brochures/*.html → cache-first; if not cached and offline, fallback to index.
// - Shell/assets → cache-first.
// - Everything else → cache-first with network fallback.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isShell = urlsToCache.some(u => req.url.startsWith(u)) ||
                  (url.origin === location.origin && (url.pathname === '/' || url.pathname.endsWith('/index.html')));

  const isPrecheckJson =
    (url.hostname.includes('googleapis.com') || url.hostname.includes('firebase')) &&
    /Pre%20Check\/.*\.json/i.test(url.href);

  const isBrochure = url.pathname.startsWith('/brochures/') || url.href.includes('/brochures/');

  if (isPrecheckJson) {
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE_NAME);
      try{
        const net = await fetch(req);
        if(net && net.ok) cache.put(req, net.clone());
        return net;
      }catch(e){
        const hit = await cache.match(req);
        return hit || new Response(JSON.stringify({offline:true}), {status:200, headers:{'Content-Type':'application/json'}});
      }
    })());
    return;
  }

  if (isBrochure || isShell) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE_NAME).then(c=>c.put(req,res.clone()));
        return res;
      }).catch(()=>caches.match('./index.html')))
    );
    return;
  }

  // default cache-first
  event.respondWith(
    caches.match(req).then(resp => resp || fetch(req).then(res => {
      if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
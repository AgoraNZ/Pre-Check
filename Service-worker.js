// Offline shell + assets (no data caching). Bump version to invalidate.
const CACHE_NAME = 'agora-precheck-shell-v9';
const urlsToCache = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  // logo used by brochure
  'https://firebasestorage.googleapis.com/v0/b/dairy-farm-record-system.appspot.com/o/Agora%20Logo%2F2F6-1YdaEP.jpeg?alt=media'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))));
  self.clients.claim();
});

// JSON is network-first (we always want live data). Shell is cache-first.
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  const isJSON = url.pathname.endsWith('.json') || url.search.includes('alt=media');
  if(isJSON){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(resp=>{
      return resp || fetch(e.request).then(r=>{
        const copy=r.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request, copy));
        return r;
      });
    }).catch(()=>caches.match('./index.html'))
  );
});
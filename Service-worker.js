// Lightweight offline shell + dynamic caching of fetched JSON/images
const CACHE_NAME = 'agora-precheck-v6';
const ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))))
  self.clients.claim();
});

// Strategy: network-first for JSON (keep fresh), cache-first for static
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  const isJSON = url.pathname.endsWith('.json') || url.search.includes('alt=media');
  if(isJSON){
    e.respondWith(
      fetch(e.request).then(resp=>{
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c=>c.put(e.request, copy));
        return resp;
      }).catch(()=>caches.match(e.request))
    );
  }else{
    e.respondWith(
      caches.match(e.request).then(res=> res || fetch(e.request).then(resp=>{
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c=>c.put(e.request, copy));
        return resp;
      }).catch(()=>caches.match('./index.html')))
    );
  }
});
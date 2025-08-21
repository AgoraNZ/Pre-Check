// Simple offline shell (no Dexie). Keeps app fast & available.
// Bump this when you ship: 
const CACHE_NAME = 'agora-precheck-shell-v7';

const urlsToCache = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  // logo (cached so brochure has a logo offline if user saved a brochure html from ZIP)
  'https://firebasestorage.googleapis.com/v0/b/dairy-farm-record-system.appspot.com/o/Agora%20Logo%2F2F6-1YdaEP.jpeg?alt=media'
];

self.addEventListener('install', evt=>{
  evt.waitUntil(
    caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt=>{
  evt.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))))
  self.clients.claim();
});

// Network-first for JSON (to stay live), cache-first for shell.
self.addEventListener('fetch', evt=>{
  const url = new URL(evt.request.url);
  const isJSON = url.pathname.endsWith('.json') || url.search.includes('alt=media');

  if(isJSON){
    evt.respondWith(
      fetch(evt.request).catch(()=>caches.match(evt.request))
    );
    return;
  }
  evt.respondWith(
    caches.match(evt.request).then(resp=>{
      return resp || fetch(evt.request).then(networkResp=>{
        const copy = networkResp.clone();
        caches.open(CACHE_NAME).then(c=>c.put(evt.request, copy));
        return networkResp;
      });
    }).catch(()=>caches.match('./index.html'))
  );
});
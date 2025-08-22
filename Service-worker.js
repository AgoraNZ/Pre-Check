// Update when you ship
const CACHE_NAME = 'agora-precheck-v46';

const urlsToCache = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k=> k===CACHE_NAME?null:caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e=>{
  const {request} = e;
  e.respondWith((async()=>{
    const hit = await caches.match(request);
    if (hit) return hit;
    try{
      const rsp = await fetch(request);
      if (rsp && rsp.status===200 && request.method==='GET' && (request.url.startsWith(self.location.origin) || request.url.includes('cdnjs') || request.url.includes('firebase')))
        caches.open(CACHE_NAME).then(c=>c.put(request, rsp.clone()));
      return rsp;
    }catch(err){
      const fallback = await caches.match('./index.html');
      return fallback || new Response('offline',{status:503});
    }
  })());
});
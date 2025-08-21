const CACHE = 'agora-downloader-shell-v1';
const ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  // cache-first for shell, network-first for everything else
  e.respondWith(
    caches.match(e.request).then(r=>r || fetch(e.request))
  );
});
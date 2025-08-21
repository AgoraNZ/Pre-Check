/* Agora Vat Pre-Check – SW (cloud-only + lazy load)
   - Caches shell and fetched Firebase JSONs so brochures you’ve opened stay available offline.
*/
const VERSION = 'vpc-sw-3-4';
const SHELL = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==VERSION?caches.delete(k):null)))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  const url = new URL(event.request.url);
  const isFirebaseJson =
    (url.hostname.includes('storage.googleapis.com') || url.hostname.includes('firebase')) &&
    /Pre%20Check\/.*\.json/i.test(url.href);

  if (isFirebaseJson) {
    // Cache-first for JSON; fall back to network; keeps brochures available offline
    event.respondWith(
      caches.open('vpc-runtime').then(async cache=>{
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try{
          const net = await fetch(event.request);
          if (net && net.ok) cache.put(event.request, net.clone());
          return net;
        }catch(_){
          return cached || new Response(JSON.stringify({error:'offline'}), {status:200, headers:{'Content-Type':'application/json'}});
        }
      })
    );
    return;
  }

  // App shell: stale-while-revalidate
  if (SHELL.some(s=>url.href.includes(s))) {
    event.respondWith(
      caches.open(VERSION).then(async cache=>{
        const cached = await cache.match(event.request);
        const fetching = fetch(event.request).then(res=>{ if(res && res.ok) cache.put(event.request,res.clone()); return res; }).catch(()=>cached);
        return cached || fetching;
      })
    );
  }
});
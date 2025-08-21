/* Agora Vat Pre-Check – Service Worker
   - Caches shell (HTML/CSS/JS) and Firebase JSON responses.
   - Strategy:
     • App shell: stale-while-revalidate
     • JSON from Firebase Storage: cache-first then network fallback
*/
const VERSION = 'vpc-sw-3.2';
const SHELL = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.4/dexie.min.js'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==VERSION?caches.delete(k):null)))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event)=>{
  const url = new URL(event.request.url);

  // Cache Firebase Storage JSONs (Pre Check/*.json)
  const isFirebaseJson = url.hostname.endsWith('googleapis.com') ||
                         url.hostname.endsWith('firebaseapp.com') ||
                         url.hostname.endsWith('storage.googleapis.com');

  if (isFirebaseJson && /Pre%20Check\/.*\.json/i.test(url.href)) {
    event.respondWith(
      caches.open('vpc-runtime').then(async (cache)=>{
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

  // App shell → stale-while-revalidate
  if (SHELL.some(s=>url.href.includes(s))) {
    event.respondWith(
      caches.open(VERSION).then(async cache=>{
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(net=>{
          if(net && net.ok) cache.put(event.request, net.clone());
          return net;
        }).catch(()=>cached);
        return cached || fetchPromise;
      })
    );
  }
});

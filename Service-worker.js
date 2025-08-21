<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Agora Pre-Check • Raw Downloader</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css">
<style>
  :root{--accent:#FF851B;--muted:#6b7280}
  body{font-family:system-ui,Segoe UI,Inter,Arial,sans-serif;background:#f7f8fb}
  .app{max-width:920px;margin:24px auto;padding:0 14px}
  .tab{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700}
  .tab.active{border-color:var(--accent);box-shadow:0 0 0 3px #ff851b2a}
  .bar{border:1px solid #e5e7eb;background:#fff;border-radius:14px;padding:14px;margin:12px 0}
  .pill{display:inline-flex;gap:8px;align-items:center;border:1px solid #e5e7eb;border-radius:999px;padding:4px 10px;background:#fff}
  .list{display:grid;grid-template-columns:1fr;gap:8px}
  .row{border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:10px;display:flex;justify-content:space-between;align-items:center}
  .muted{color:var(--muted)}
  .btn-brand{background:var(--accent);border:none;color:#fff;font-weight:800}
  .btn-brand:hover{background:#ff6d00}
</style>
</head>
<body>
<div class="app">
  <div class="d-flex gap-2 mb-2">
    <button id="tab-summary" class="tab active">Summary</button>
    <button id="tab-admin" class="tab">Admin</button>
    <div class="ms-auto d-flex align-items-center gap-2">
      <span class="pill"><span class="muted">Cloud</span><b id="cloud">–</b></span>
      <div class="progress" style="width:160px"><div id="bar" class="progress-bar" style="width:0%"></div></div>
      <span id="pct" class="muted">0%</span>
    </div>
  </div>

  <!-- SUMMARY: dairy numbers only -->
  <div id="view-summary">
    <div class="bar">
      <div class="mb-2"><b>Dairy list</b> <span class="muted">• numbers only for speed</span></div>
      <input id="search" class="form-control mb-2" placeholder="Search dairy #">
      <div id="list" class="list"></div>
    </div>
  </div>

  <!-- ADMIN: one big ZIP download -->
  <div id="view-admin" class="d-none">
    <div class="bar">
      <div class="mb-2"><b>Raw downloads</b></div>
      <button id="btn-zip" class="btn btn-brand">Download ALL raw JSON (ZIP)</button>
      <div class="mt-2 small muted" id="status">Idle.</div>
    </div>
  </div>
</div>

<!-- Firebase + libs -->
<script src="https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.15.0/firebase-storage-compat.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>

<script>
/* ---------------- Firebase ---------------- */
firebase.initializeApp({
  apiKey:"AIzaSyDr9nA44Kkej*****GUzbMDECI8cTFI",
  authDomain:"dairy-farm-record-system.firebaseapp.com",
  projectId:"dairy-farm-record-system",
  storageBucket:"dairy-farm-record-system.appspot.com",
  messagingSenderId:"422124188212",
  appId:"1:422124188212:web:1bd31bee8d6e91e301d061"
});
const storage = firebase.storage();
const FOLDER = 'Pre Check';

/* ---------------- UI helpers ---------------- */
const $ = id => document.getElementById(id);
function setPct(done,total){ const p=total?Math.floor(done/total*100):0; $('bar').style.width=p+'%'; $('pct').textContent=p+'%'; }

/* ---------------- Tabs ---------------- */
$('tab-summary').onclick=()=>{ $('tab-summary').classList.add('active'); $('tab-admin').classList.remove('active'); $('view-summary').classList.remove('d-none'); $('view-admin').classList.add('d-none'); }
$('tab-admin').onclick =()=>{ $('tab-admin').classList.add('active'); $('tab-summary').classList.remove('active'); $('view-admin').classList.remove('d-none'); $('view-summary').classList.add('d-none'); }

/* ---------------- List dairy numbers only ---------------- */
let KEYS = [];   // filenames
async function loadList() {
  try{
    const res = await storage.ref(FOLDER).listAll();
    KEYS = res.items.filter(i=>/\.json$/i.test(i.name)).map(i=>i.name);
    $('cloud').textContent = KEYS.length;

    // render numbers only (no fetch)
    const html = KEYS.sort().map(name=>{
      const dn = name.replace('.json','');
      return `<div class="row"><div><b>#${dn}</b></div>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-secondary" onclick="openSingle('${dn}')">Details</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="printSingle('${dn}')">Print</button>
              </div></div>`;
    }).join('');
    $('list').innerHTML = html;
    setPct(KEYS.length,KEYS.length);
  }catch(e){
    $('list').innerHTML = `<div class="muted">Failed to list folder. ${e.message||e}</div>`;
  }
}
window.addEventListener('DOMContentLoaded', loadList);

/* Search filter (client-side, on names only) */
$('search').addEventListener('input', ()=>{
  const q = $('search').value.trim().toLowerCase();
  Array.from($('list').children).forEach(row=>{
    row.style.display = row.textContent.toLowerCase().includes(q)? '' : 'none';
  });
});

/* ---------------- On-demand single fetch (optional) ---------------- */
async function fetchRecord(dn){
  const url = await storage.ref(`${FOLDER}/${dn}.json`).getDownloadURL();
  return await fetch(url).then(r=>r.json());
}
window.openSingle = async (dn)=>{
  // simple alert viewer to prove mapping later
  try{
    const rec = await fetchRecord(dn);
    alert(`#${dn}\nVat1: ${rec['vat1-capacity']||''}\nVat2: ${rec['vat2-capacity']||''}`);
  }catch(e){ alert('Failed to fetch '+dn); }
};
window.printSingle = async (dn)=>{
  // prints raw JSON for now (no brochure, by request: minimal)
  try{
    const data = await fetchRecord(dn);
    const w = window.open('', '_blank');
    w.document.write(`<pre>${JSON.stringify(data,null,2)}</pre>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(), 200);
  }catch(e){ alert('Failed to fetch '+dn); }
};

/* ---------------- Admin: ZIP all raw JSON (sequential, low memory) ---------------- */
$('btn-zip').onclick = async ()=>{
  if(!KEYS.length){ await loadList(); if(!KEYS.length){ alert('No files'); return; } }
  $('status').textContent = 'Starting ZIP…';
  const zip = new JSZip();
  let done = 0;
  for(const name of KEYS){
    try{
      const url = await storage.ref(`${FOLDER}/${name}`).getDownloadURL();
      const text = await fetch(url).then(r=>r.text());
      zip.file(name, text);
    }catch(e){
      // include a tiny error stub so you still get the file list
      zip.file(name.replace('.json','')+'_ERROR.txt', String(e));
    }
    done++; setPct(done, KEYS.length);
    $('status').textContent = `Added ${done} / ${KEYS.length}`;
    // yield a tick for iOS memory
    await new Promise(r=>setTimeout(r,0));
  }
  $('status').textContent = 'Building ZIP…';
  const blob = await zip.generateAsync({type:'blob'});
  saveAs(blob, 'precheck_raw_json.zip');
  $('status').textContent = 'Done.';
};

/* ---------------- Service Worker (offline shell) ---------------- */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
</script>
</body>
</html>
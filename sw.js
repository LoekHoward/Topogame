// Bewaart de app op de telefoon, zodat hij ook zonder internet werkt.
// Verhoog VERSION na een update, dan haalt de telefoon de nieuwe bestanden op.
const VERSION = 'geomaster-v4';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'countries-50m.json',
  'lib/d3.min.js',
  'lib/topojson.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];
const EXTERNAL = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  // Elk bestand apart, zodat één ontbrekend bestand de rest niet tegenhoudt.
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.allSettled(FILES.map(f => c.add(new Request(f, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function save(req, res) {
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !EXTERNAL.includes(url.hostname)) return;
  if (req.mode === 'navigate') {
    // De pagina zelf: eerst van internet (dan zie je updates), offline uit de opslag.
    e.respondWith(fetch(req).then(res => save(req, res))
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
    return;
  }
  // De rest: eerst uit de opslag, anders van internet (en dan bewaren).
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => save(req, res))));
});

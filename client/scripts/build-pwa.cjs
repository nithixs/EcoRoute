const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = path.join(__dirname, '../build');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'asset-manifest.json'), 'utf8'));
const assets = [...new Set(['/index.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', ...Object.values(manifest.files).filter(file => !file.endsWith('.map'))])];
const version = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'index.html'))).digest('hex').slice(0, 12);
const code = `
const CACHE = 'ecoroute-shell-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ecoroute-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
`;
fs.writeFileSync(path.join(dir, 'service-worker.js'), code);
console.log(`Generated offline app shell ${version}; APIs and map tiles are never cached.`);

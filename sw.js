// CACIH · service worker: abre sin señal y muestra los avisos de la caja.
const CACHE = 'cacih-v1.4.0';
const SHELL = [
  './', './index.html', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './logo-cacih.png', './logo-icono.png',
  './vendor/supabase.js', './vendor/591.supabase.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;           // datos y documentos: nunca desde caché

  if (url.origin === self.location.origin) {                   // app: red primero, caché si no hay señal
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // fuentes de Google: caché primero
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});

// ===== Avisos =====
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { cuerpo: e.data && e.data.text() }; }
  const title = d.titulo || 'CACIH';
  e.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: d.cuerpo || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || './' }
    });
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach(w => w.postMessage({ type: 'aviso', tipo: d.tipo }));
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find(c => new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));
    if (w) { await w.focus(); w.postMessage({ type: 'navegar', url: target.replace(/^\.\//, '') }); }
    else await self.clients.openWindow(new URL(target, self.registration.scope).href);
  })());
});

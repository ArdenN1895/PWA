const CACHE = 'x-minimal-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    '/', '/index.html', '/home.html', '/style.css', '/script.js'
  ])));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Background sync for posts (optional but nice)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-posts') {
    // implement queued posts sync here if you want full offline posting
  }
});
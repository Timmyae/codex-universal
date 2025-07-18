self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('ems-exam-cache').then(cache => cache.addAll([
      '/',
      '/index.html',
      '/question_bank.json',
      '/adaptive-algorithm.js'
    ]))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

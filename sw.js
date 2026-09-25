const CACHE_PREFIX = 'aurobindo-shell-';
const CACHE = `${CACHE_PREFIX}v47`;
const ASSETS = ['./', './index.html', './styles.css?v=29', './app.js?v=18', './tile-match.js?v=19', './symptom-match.html', './symptom-match.css?v=18', './symptom-match.js?v=20', './chromatogram.html', './chromatogram.css?v=23', './chromatogram.js?v=22', './assets/toggle%20button.png', './assets/4%20arrow%20toggle%20outline.png', './assets/hpcl-logo.png', './assets/game-1-card.png', './assets/game-2-card.png', './assets/game-3-card.png', './assets/game-4-card.png', './logo.png', './icon.svg', './icons/icon-192.png', './icons/icon-512.png', './manifest.webmanifest'];
ASSETS.push('./cleaning-solution.html', './cleaning-solution.css?v=7', './cleaning-solution.js?v=6');
ASSETS.splice(ASSETS.indexOf('./app.js?v=18'), 1, './app.js?v=23');
ASSETS.push('./account.js?v=7', './account.css?v=5', './hero-carousel.js?v=2', './leaderboard.css?v=5');
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.match(event.request, { ignoreSearch: true })) ||
      caches.match(new URL('./index.html', self.registration.scope).href)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

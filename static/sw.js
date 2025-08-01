// Simple service worker to handle 404 errors
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Handle the chemical.sw.js 404 error
  if (event.request.url.includes('chemical.sw.js')) {
    event.respondWith(new Response('', { status: 404 }));
    return;
  }
  
  // For all other requests, use the network
  event.respondWith(fetch(event.request));
}); 
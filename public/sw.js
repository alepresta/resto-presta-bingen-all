// Kill switch del Service Worker:
// limpia cualquier caché vieja, se desregistra y fuerza recarga de clientes.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      clients.forEach((client) => {
        client.navigate(client.url);
      });
    })()
  );
});

// Sin estrategias de fetch: la red queda a cargo del navegador.

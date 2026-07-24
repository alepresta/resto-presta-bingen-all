// Service Worker estable y minimalista.
// No cachea assets ni respuestas: deja la red al navegador.
// Solo toma control de clientes para evitar ciclos de registro/desregistro.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Sin estrategias de fetch: comportamiento online-first del navegador.

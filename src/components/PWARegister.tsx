'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isProd = process.env.NODE_ENV === 'production';

    // En desarrollo: sin SW para evitar problemas de caché durante iteración.
    const cleanup = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        // noop
      }
    };

    if (!isProd) {
      cleanup();
      return;
    }

    // En producción registramos el kill switch (/sw.js) para limpiar SWs viejos.
    const registerKillSwitch = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        await reg.update();
      } catch {
        // noop
      }
    };

    registerKillSwitch();
  }, []);

  return null;
}

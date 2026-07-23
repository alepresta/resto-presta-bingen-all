'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isProd = process.env.NODE_ENV === 'production';

    // En desarrollo evitamos SW para no cachear chunks de Next y romper el hot reload.
    if (!isProd) {
      const cleanupDev = async () => {
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

      cleanupDev();
      return;
    }

    let refrescando = false;

    const onControllerChange = () => {
      if (refrescando) return;
      refrescando = true;
      window.location.reload();
    };

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        // Fuerza chequeo de versión del SW al abrir la app.
        await reg.update();

        // Si hay un SW esperando, activarlo de inmediato.
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Cuando se detecta uno nuevo, pedir activación inmediata.
        reg.addEventListener('updatefound', () => {
          const nuevo = reg.installing;
          if (!nuevo) return;

          nuevo.addEventListener('statechange', () => {
            if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
              nuevo.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      } catch {
        // noop: si falla el registro, la web sigue funcionando normal
      }
    };

    register();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}

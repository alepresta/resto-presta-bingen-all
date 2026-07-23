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

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // noop: si falla el registro, la web sigue funcionando normal
      }
    };

    register();
  }, []);

  return null;
}

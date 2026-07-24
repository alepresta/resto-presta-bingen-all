'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

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

    // Hotfix: desactivamos SW también en producción para eliminar interferencias
    // en apertura desde PWA instalada e in-app browsers (WhatsApp, etc.).
    cleanup();
  }, []);

  return null;
}

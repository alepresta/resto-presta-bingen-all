'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const ios = useMemo(() => isIosDevice(), []);
  const standalone = useMemo(() => isStandaloneMode(), []);

  useEffect(() => {
    if (standalone || dismissed) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (ios) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [ios, standalone, dismissed]);

  if (!visible || standalone) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setVisible(false);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[60] sm:left-auto sm:right-4 sm:w-[360px]">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur border border-amber-200 dark:border-amber-900 shadow-xl rounded-xl p-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Instalá Hidelgarda en tu teléfono</p>
        {ios && !deferredPrompt ? (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">En iPhone: tocá Compartir y luego Agregar a pantalla de inicio.</p>
        ) : (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Tocá instalar para tener acceso rápido desde la pantalla principal.</p>
        )}

        <div className="mt-3 flex gap-2">
          {deferredPrompt ? (
            <button
              onClick={install}
              disabled={installing}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm py-2 rounded-lg"
            >
              {installing ? 'Instalando...' : 'Instalar app'}
            </button>
          ) : null}
          <button
            onClick={() => {
              setVisible(false);
              setDismissed(true);
            }}
            className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

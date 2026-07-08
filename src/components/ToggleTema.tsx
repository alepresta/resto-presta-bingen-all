'use client';

import { useTheme } from './ThemeProvider';

export default function ToggleTema() {
  const { tema, toggleTema } = useTheme();

  return (
    <button
      onClick={toggleTema}
      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
      title={tema === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      aria-label="Cambiar tema"
    >
      {tema === 'light' ? (
        <span className="text-xl">🌙</span>
      ) : (
        <span className="text-xl">☀️</span>
      )}
    </button>
  );
}

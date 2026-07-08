'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Tema = 'light' | 'dark';

interface ThemeContextType {
  tema: Tema;
  toggleTema: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  tema: 'light',
  toggleTema: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Cargar tema guardado o detectar preferencia del sistema
    const temaGuardado = localStorage.getItem('tema') as Tema | null;
    const preferenciaSistema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const temaInicial = temaGuardado || preferenciaSistema;
    
    setTema(temaInicial);
    document.documentElement.classList.toggle('dark', temaInicial === 'dark');
  }, []);

  const toggleTema = () => {
    const nuevoTema = tema === 'light' ? 'dark' : 'light';
    setTema(nuevoTema);
    localStorage.setItem('tema', nuevoTema);
    document.documentElement.classList.toggle('dark', nuevoTema === 'dark');
  };

  // Evitar flash de contenido incorrecto
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

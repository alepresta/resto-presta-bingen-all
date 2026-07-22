'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import ToggleTema from '@/components/ToggleTema';

interface Usuario {
  nombre: string;
  rol: string;
}

interface SiteHeaderProps {
  usuario: Usuario | null;
}

interface MiGrupo {
  id: string;
  palabra_secreta: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  confirmado: boolean;
}

function fmtFechaCorta(s: string): string {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function SiteHeader({ usuario }: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Grupos a los que pertenece el usuario (para el botón "Mis pedidos")
  const [misGrupos, setMisGrupos] = useState<MiGrupo[]>([]);
  const [menuGruposAbierto, setMenuGruposAbierto] = useState(false);
  const menuGruposRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    const supabase = createSupabaseBrowserClient();

    const cargarMisGrupos = async () => {
      try {
        const params = new URLSearchParams();

        // 1) Usuario logueado (Supabase auth)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          params.set('cliente_id', user.id);
          if (user.email) params.set('email', user.email);
        }

        // 2) Cliente guardado en localStorage (invitado)
        try {
          const guardado = localStorage.getItem('cliente_actual');
          if (guardado) {
            const c = JSON.parse(guardado);
            if (c?.id && !params.get('cliente_id')) params.set('cliente_id', c.id);
            if (c?.email && !params.get('email')) params.set('email', c.email);
          }
        } catch {
          /* noop */
        }

        if (!params.get('cliente_id') && !params.get('email')) {
          if (!cancelado) setMisGrupos([]);
          return;
        }

        const res = await fetch(`/api/grupos/mis?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelado) setMisGrupos(data.grupos || []);
      } catch {
        /* noop */
      }
    };

    cargarMisGrupos();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      cargarMisGrupos();
    });

    return () => {
      cancelado = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuGruposRef.current && !menuGruposRef.current.contains(e.target as Node)) {
        setMenuGruposAbierto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/menu/resto-presta-bingen-all');
    router.refresh();
  };

  const puedeVerPanel = usuario?.rol === 'admin';

  return (
    <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Marca */}
        <Link href="/menu/resto-presta-bingen-all" className="flex-shrink-0 w-full md:w-auto">
          <span className="block text-lg sm:text-xl md:text-2xl font-bold font-serif leading-tight break-words">RESTO PRESTA BINGEN ALL</span>
          <span className="hidden md:block text-xs italic text-amber-100">Comida es Medicina</span>
        </Link>

        {/* Controles */}
        <div className="w-full md:w-auto flex flex-wrap items-center justify-start md:justify-end gap-2">
          <Link
            href="/menu/resto-presta-bingen-all"
            className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
          >
            🏠 Inicio
          </Link>
          <Link
            href="/pedidos"
            className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
          >
            📋 Pedidos
          </Link>

          {/* Modo día / noche */}
          <ToggleTema />

          {/* Mis pedidos (grupos a los que pertenezco) */}
          {misGrupos.length > 0 ? (
            <div className="relative" ref={menuGruposRef}>
              <button
                onClick={() => setMenuGruposAbierto((v) => !v)}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20 flex items-center gap-1"
              >
                🍽️ Mis pedidos ({misGrupos.length})
                <span className="text-xs">{menuGruposAbierto ? '▲' : '▼'}</span>
              </button>
              {menuGruposAbierto && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-96 overflow-y-auto">
                  {misGrupos.map((g) => (
                    <Link
                      key={g.id}
                      href={`/pedidos/grupo/${g.id}`}
                      onClick={() => setMenuGruposAbierto(false)}
                      className="block px-4 py-2 hover:bg-amber-50 text-gray-800 dark:text-gray-100"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-700 tracking-widest">{g.palabra_secreta}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            g.estado === 'confirmado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {g.estado}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        📅 {fmtFechaCorta(g.fecha_inicio)} – {fmtFechaCorta(g.fecha_fin)}
                        {g.confirmado ? ' · ✅ confirmaste' : ''}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {!usuario ? (
            <>
              <Link
                href="/auth/login"
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/auth/registro"
                className="bg-white text-amber-700 font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors hover:bg-amber-50"
              >
                Registrarme
              </Link>
            </>
          ) : (
            <>
              <span className="hidden md:inline text-white/90 text-sm mr-1">
                {usuario.nombre}
                <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">{usuario.rol}</span>
              </span>
              {puedeVerPanel && (
                <Link
                  href="/admin"
                  className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
                >
                  ⚙️ Panel
                </Link>
              )}
              <Link
                href="/auth/perfil"
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
              >
                👤 Perfil
              </Link>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20 disabled:opacity-50"
              >
                {loading ? 'Saliendo...' : '🚪 Salir'}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

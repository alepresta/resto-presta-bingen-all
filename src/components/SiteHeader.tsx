'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const HOME_HREF = '/';

  // Grupos a los que pertenece el usuario (para el botón "Mis pedidos")
  const [misGrupos, setMisGrupos] = useState<MiGrupo[]>([]);
  const [accionesAbierto, setAccionesAbierto] = useState(false);
  const accionesRef = useRef<HTMLDivElement>(null);

  const cargarMisGrupos = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const params = new URLSearchParams();

      // 1) Usuario logueado (Supabase auth)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        params.set('cliente_id', user.id);
      }

      // 2) Cliente guardado en localStorage (invitado)
      try {
        const guardado = localStorage.getItem('cliente_actual');
        if (guardado) {
          const c = JSON.parse(guardado);
          if (c?.id) {
            if (!params.get('cliente_id')) params.set('cliente_id', c.id);
            else if (params.get('cliente_id') !== c.id) params.set('cliente_id_local', c.id);
          }
        }
      } catch {
        /* noop */
      }

      if (!params.get('cliente_id') && !params.get('cliente_id_local')) {
        setMisGrupos([]);
        return;
      }

      const res = await fetch(`/api/grupos/mis?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMisGrupos(data.grupos || []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    const supabase = createSupabaseBrowserClient();

    const cargarSiActivo = async () => {
      if (cancelado) return;
      await cargarMisGrupos();
    };

    cargarSiActivo();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      cargarSiActivo();
    });

    return () => {
      cancelado = true;
      subscription.unsubscribe();
    };
  }, [pathname, cargarMisGrupos]);

  // Refresco reactivo: volver a la pestaña, recuperar foco o actualizar cliente local.
  useEffect(() => {
    const onFocus = () => {
      cargarMisGrupos();
    };
    const onVisibility = () => {
      if (!document.hidden) cargarMisGrupos();
    };
    const onClienteActual = () => {
      cargarMisGrupos();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('cliente-actual-updated', onClienteActual as EventListener);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('cliente-actual-updated', onClienteActual as EventListener);
    };
  }, [cargarMisGrupos]);

  // Cerrar el menú de acciones al hacer clic fuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (accionesRef.current && !accionesRef.current.contains(e.target as Node)) {
        setAccionesAbierto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    try {
      localStorage.removeItem('cliente_actual');
      window.dispatchEvent(new Event('cliente-actual-updated'));
    } catch {
      /* noop */
    }

    setMisGrupos([]);
    setAccionesAbierto(false);

    router.replace('/auth/login');
    router.refresh();

    // Fallback para casos donde el router no refleja el logout de inmediato.
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.assign('/auth/login');
      }
    }, 350);
  };

  const navegarConRecarga = (href: string) => {
    if (typeof window !== 'undefined') {
      const base = window.location.origin;
      const url = href.startsWith('http') ? new URL(href) : new URL(href, base);
      url.searchParams.set('_r', String(Date.now()));
      window.location.assign(url.toString());
      return;
    }
    router.push(href);
  };

  const puedeVerPanel = usuario?.rol === 'admin';
  const btnBase =
    'bg-white/15 hover:bg-white/25 text-white font-semibold px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-sm transition-colors backdrop-blur-sm border border-white/20 text-center justify-center whitespace-nowrap';
  const miGrupoHrefCliente = misGrupos.length > 0 ? `/pedidos/grupo/${misGrupos[0].id}` : '/menu/resto-presta-bingen-all';

  return (
    <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 sm:gap-3">
        {/* Marca */}
        <button
          type="button"
          onClick={() => navegarConRecarga(HOME_HREF)}
          className="w-full lg:w-auto flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-2 py-1.5 sm:px-3 sm:py-3 text-left backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="Ir a la home"
        >
          <span className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/15 text-base sm:text-2xl shrink-0">
            🌿
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] sm:text-lg md:text-2xl font-bold font-serif leading-tight break-words">RESTO PRESTA BINGEN ALL</span>
            <span className="hidden md:block text-[11px] sm:text-xs text-amber-100/90">
              Ir a la home · Comida es Medicina
            </span>
          </span>
        </button>

        {/* Controles */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-1.5 sm:gap-2">
          {!usuario ? (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 w-full sm:w-auto">
              <a
                href="/auth/login"
                onClick={(e) => {
                  e.preventDefault();
                  navegarConRecarga('/auth/login');
                }}
                className={`${btnBase} min-w-[110px] sm:min-w-0`}
              >
                Iniciar sesión
              </a>
              <a
                href="/auth/registro"
                onClick={(e) => {
                  e.preventDefault();
                  navegarConRecarga('/auth/registro');
                }}
                className="bg-white text-amber-700 font-semibold px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-sm transition-colors hover:bg-amber-50 text-center min-w-[110px] sm:min-w-0"
              >
                Registrarme
              </a>
            </div>
          ) : (
            <>
              <div className="flex w-full items-center justify-between sm:justify-end gap-2">
                <span className="text-white/95 text-[11px] sm:text-sm font-semibold px-2 py-0.5 rounded-full bg-black/10 border border-white/10 truncate max-w-[68%] sm:max-w-none">
                  Hola {usuario.nombre}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto sm:flex sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
                {puedeVerPanel ? (
                  <>
                    <a
                      href="/admin"
                      onClick={(e) => {
                        e.preventDefault();
                        navegarConRecarga('/admin');
                      }}
                      className={`${btnBase} flex items-center min-w-0`}
                    >
                      ⚙️ Panel
                    </a>
                    <a
                      href="/admin/pedidos"
                      onClick={(e) => {
                        e.preventDefault();
                        navegarConRecarga('/admin/pedidos');
                      }}
                      className={`${btnBase} flex items-center min-w-0`}
                    >
                      🍽️ MiGrupo
                    </a>
                  </>
                ) : (
                  <a
                    href={miGrupoHrefCliente}
                    onClick={(e) => {
                      e.preventDefault();
                      navegarConRecarga(miGrupoHrefCliente);
                    }}
                    className={`${btnBase} col-span-1 sm:col-span-1 flex items-center min-w-0`}
                  >
                    🍽️ MiGrupo
                  </a>
                )}
                <div className="relative min-w-0" ref={accionesRef}>
                <button
                  onClick={() => setAccionesAbierto((v) => !v)}
                  className={`${btnBase} w-full sm:w-auto flex items-center justify-center gap-1`}
                >
                  ⚡ Acciones
                  <span className="text-xs">{accionesAbierto ? '▲' : '▼'}</span>
                </button>
                {accionesAbierto && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{usuario.nombre}</p>
                      <p className="text-xs font-semibold text-amber-700">{usuario.rol}</p>
                    </div>
                    <a
                      href="/auth/perfil"
                      onClick={(e) => {
                        e.preventDefault();
                        setAccionesAbierto(false);
                        navegarConRecarga('/auth/perfil');
                      }}
                      className="block px-4 py-2 hover:bg-amber-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
                    >
                      👤 Perfil
                    </a>
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-gray-700 dark:text-gray-200 text-sm">
                        <span>🌓 Modo</span>
                        <ToggleTema />
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      disabled={loading}
                      className="w-full text-left px-4 py-2 hover:bg-amber-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm disabled:opacity-50"
                    >
                      {loading ? 'Saliendo...' : '🚪 Salir'}
                    </button>
                  </div>
                )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

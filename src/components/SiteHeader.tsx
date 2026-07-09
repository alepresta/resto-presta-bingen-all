'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface Usuario {
  nombre: string;
  rol: string;
}

interface SiteHeaderProps {
  usuario: Usuario | null;
}

export default function SiteHeader({ usuario }: SiteHeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/menu/resto-presta-bingen-all');
    router.refresh();
  };

  const puedeVerPanel = usuario?.rol === 'admin' || usuario?.rol === 'lector';

  return (
    <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Marca */}
        <Link href="/menu/resto-presta-bingen-all" className="flex-shrink-0">
          <span className="text-xl md:text-2xl font-bold font-serif">RESTO PRESTA BINGEN ALL</span>
          <span className="hidden md:block text-xs italic text-amber-100">Comida es Medicina</span>
        </Link>

        {/* Controles */}
        <div className="flex items-center gap-2">
          <Link
            href="/inicio"
            className="hidden sm:inline-block bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
          >
            🏠 Pedidos grupales
          </Link>
          <Link
            href="/pedidos"
            className="hidden sm:inline-block bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
          >
            📦 Pedidos
          </Link>

          {!usuario ? (
            <>
              <Link
                href="/auth/login"
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/auth/registro"
                className="bg-white text-amber-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors hover:bg-amber-50"
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
                  className="bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
                >
                  ⚙️ Panel
                </Link>
              )}
              <Link
                href="/auth/cambiar-password"
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20"
              >
                🔑 Contraseña
              </Link>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm border border-white/20 disabled:opacity-50"
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

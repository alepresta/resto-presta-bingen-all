'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectRaw = searchParams.get('redirect') || '/menu/resto-presta-bingen-all';
  const redirectTo = (() => {
    const limpio = redirectRaw.trim();
    // Solo permitimos rutas internas y tomamos el primer token por si llega
    // un valor con texto extra (ej: "/admin panel").
    const primero = limpio.split(/\s+/)[0] || '/menu/resto-presta-bingen-all';
    return primero.startsWith('/') ? primero : '/menu/resto-presta-bingen-all';
  })();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError('Email o contraseña incorrectos');
      setLoading(false);
      return;
    }

    // Navegación de cliente + refresh para que el servidor lea la sesión.
    // Agregamos fallback por navegación directa para evitar requerir F5.
    router.replace(redirectTo);
    router.refresh();

    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== redirectTo) {
        window.location.assign(redirectTo);
      }
    }, 350);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🌾</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Iniciar sesión</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">RESTO PRESTA BINGEN ALL</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Contraseña</label>
          <div className="relative">
            <input
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700"
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <p>
          ¿No tenés cuenta?{' '}
          <Link href="/auth/registro" className="text-amber-700 font-semibold hover:underline">
            Registrate
          </Link>
        </p>
        <p>
          <Link href="/menu/resto-presta-bingen-all" className="text-gray-500 dark:text-gray-400 hover:underline">
            ← Volver al menú
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

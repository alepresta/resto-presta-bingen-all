'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function PerfilPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState('');

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const aviso = (tipo: 'ok' | 'error', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login?redirect=/auth/perfil');
        return;
      }

      setUserId(user.id);
      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, nombre, apellido, telefono, rol')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username || '');
        setNombre(profile.nombre || '');
        setApellido(profile.apellido || '');
        setTelefono(profile.telefono || '');
        setRol(profile.rol || '');
      }
      setCargando(false);
    })();
  }, [router]);

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, nombre, apellido, telefono, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      aviso('ok', '✅ Perfil actualizado');
    } catch (err: any) {
      aviso('error', `❌ ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      aviso('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== password2) {
      aviso('error', 'Las contraseñas no coinciden');
      return;
    }
    setGuardando(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setPassword('');
      setPassword2('');
      aviso('ok', '✅ Contraseña actualizada');
    } catch (err: any) {
      aviso('error', `❌ ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">Cargando perfil…</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">👤 Mi perfil</h1>
          <Link href="/menu/resto-presta-bingen-all" className="text-amber-700 font-semibold hover:underline text-sm">
            ← Volver
          </Link>
        </div>

        {msg && (
          <div
            className={`px-4 py-3 rounded-lg text-sm border ${
              msg.tipo === 'ok'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {msg.texto}
          </div>
        )}

        {/* Datos del perfil */}
        <form onSubmit={guardarPerfil} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100">Datos personales</h2>
          {rol && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Rol: <span className="font-semibold">{rol}</span>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="ej: mgonzalez"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="bg-amber-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {guardando ? '⏳ Guardando…' : 'Guardar cambios'}
          </button>
        </form>

        {/* Cambiar contraseña */}
        <form onSubmit={cambiarPassword} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100">Cambiar contraseña</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Repetir contraseña</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? '⏳…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUsuarioConRol } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import GestionUsuarios from './GestionUsuarios';

export const dynamic = 'force-dynamic';

export default async function AdminUsuariosPage() {
  const usuario = await getUsuarioConRol();

  if (!usuario) {
    redirect('/auth/login?redirect=/admin/usuarios');
  }
  if (usuario.rol !== 'admin') {
    redirect('/admin');
  }

  const supabase = createServerSupabaseClient();
  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, username, nombre, apellido, email, telefono, rol, created_at')
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">👤 Gestión de Usuarios</h1>
            <p className="text-indigo-100 text-sm">Crear, editar, asignar rol y cambiar contraseñas</p>
          </div>
          <Link href="/admin" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold">
            ← Panel
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <GestionUsuarios usuariosIniciales={usuarios || []} miId={usuario.id} />
      </main>
    </div>
  );
}

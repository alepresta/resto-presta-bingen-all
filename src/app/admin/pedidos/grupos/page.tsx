import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import AccionesGrupo from './AccionesGrupo';

export default async function AdminGruposPage() {
  const supabase = createServerSupabaseClient();

  const { data: grupos, error } = await supabase
    .from('grupos_pedido')
    .select(`
      *,
      miembros:grupo_miembros(
        id,
        confirmado_general,
        cliente:clientes(id, nombre, email)
      ),
      items:grupo_items(id)
    `)
    .order('fecha_inicio', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">👥 Gestión de Grupos de Pedido</h1>
            <p className="text-indigo-100 text-sm">Panel de administración - Crear, confirmar y gestionar grupos</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              ← Panel
            </Link>
            <Link
              href="/admin/pedidos/grupos/nuevo"
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              ➕ Crear Grupo
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ❌ Error: {error.message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-600 font-semibold">TOTAL GRUPOS</p>
            <p className="text-2xl font-bold">{grupos?.length || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-500">
            <p className="text-xs text-gray-600 font-semibold">ARMANDO</p>
            <p className="text-2xl font-bold">
              {grupos?.filter((g) => g.estado === 'armando').length || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-600 font-semibold">CONFIRMADOS</p>
            <p className="text-2xl font-bold">
              {grupos?.filter((g) => g.estado === 'confirmado').length || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-600 font-semibold">MIEMBROS TOTALES</p>
            <p className="text-2xl font-bold">
              {grupos?.reduce((sum, g) => sum + (g.miembros?.length || 0), 0) || 0}
            </p>
          </div>
        </div>

        {/* Lista de grupos */}
        <div className="space-y-4">
          {grupos?.map((grupo: any) => {
            const miembrosConfirmados = grupo.miembros?.filter((m: any) => m.confirmado_general).length || 0;
            const totalMiembros = grupo.miembros?.length || 0;
            const totalItems = grupo.items?.length || 0;

            return (
              <div
                key={grupo.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info del grupo */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-800 text-xl">
                        🔐 {grupo.palabra_secreta}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        grupo.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
                        grupo.estado === 'armando' ? 'bg-yellow-100 text-yellow-700' :
                        grupo.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {grupo.estado.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">📅 Período</p>
                        <p className="font-semibold text-gray-800">
                          {new Date(grupo.fecha_inicio).toLocaleDateString('es-AR')} - {new Date(grupo.fecha_fin).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">👥 Miembros</p>
                        <p className="font-semibold text-gray-800">{totalMiembros}/4</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">✅ Confirmados</p>
                        <p className="font-semibold text-gray-800">{miembrosConfirmados}/{totalMiembros}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">🍽️ Platos</p>
                        <p className="font-semibold text-gray-800">{totalItems}</p>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/pedidos/grupos/${grupo.id}`}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-semibold text-sm"
                    >
                      👁️ Ver
                    </Link>
                    <AccionesGrupo
                      grupoId={grupo.id}
                      estado={grupo.estado}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(!grupos || grupos.length === 0) && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No hay grupos creados aún</p>
            <Link
              href="/admin/pedidos/grupos/nuevo"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
            >
              Crear el primer grupo
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import GestionMiembros from './GestionMiembros';

export default async function DetalleGrupoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();

  const { data: grupo, error } = await supabase
    .from('grupos_pedido')
    .select(`
      *,
      miembros:grupo_miembros(
        *,
        cliente:clientes(id, nombre, email)
      ),
      items:grupo_items(
        *,
        plato:platos(id, nombre, categoria_id, precio)
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !grupo) {
    notFound();
  }

  // Obtener todos los clientes disponibles para agregar
  const { data: clientesDisponibles } = await supabase
    .from('clientes')
    .select('id, nombre, email')
    .order('nombre');

  const miembrosConfirmados = grupo.miembros?.filter((m: any) => m.confirmado_general).length || 0;
  const totalMiembros = grupo.miembros?.length || 0;
  const totalItems = grupo.items?.length || 0;

  // Calcular total
  const total = grupo.items?.reduce((sum: number, item: any) => {
    return sum + (item.plato?.precio || 0) * item.cantidad;
  }, 0) || 0;

  // Agrupar items por fecha
  const itemsPorFecha: Record<string, any[]> = {};
  grupo.items?.forEach((item: any) => {
    if (!itemsPorFecha[item.fecha]) {
      itemsPorFecha[item.fecha] = [];
    }
    itemsPorFecha[item.fecha].push(item);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🔐 Grupo {grupo.palabra_secreta}</h1>
            <p className="text-indigo-100 text-sm">
              {new Date(grupo.fecha_inicio).toLocaleDateString('es-AR')} - {new Date(grupo.fecha_fin).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/pedidos/grupos"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              ← Volver
            </Link>
            <Link
              href={`/pedidos/grupo/${grupo.id}`}
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-semibold"
              target="_blank"
            >
              👁️ Ver como cliente
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-600 font-semibold">ESTADO</p>
            <p className={`text-lg font-bold mt-1 ${
              grupo.estado === 'confirmado' ? 'text-green-600' :
              grupo.estado === 'armando' ? 'text-yellow-600' :
              grupo.estado === 'cancelado' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {grupo.estado.toUpperCase()}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-600 font-semibold">MIEMBROS</p>
            <p className="text-2xl font-bold">{totalMiembros}/4</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-600 font-semibold">CONFIRMADOS</p>
            <p className="text-2xl font-bold">{miembrosConfirmados}/{totalMiembros}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
            <p className="text-xs text-gray-600 font-semibold">PLATOS</p>
            <p className="text-2xl font-bold">{totalItems}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-600 font-semibold">TOTAL</p>
            <p className="text-2xl font-bold">${total.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Gestión de miembros */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">👥 Miembros del Grupo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {grupo.miembros?.map((miembro: any) => (
              <div
                key={miembro.id}
                className={`p-4 rounded-lg border-2 ${
                  miembro.confirmado_general
                    ? 'bg-green-50 border-green-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{miembro.cliente.nombre}</p>
                    <p className="text-sm text-gray-600">{miembro.cliente.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rol: {miembro.rol} · Se unió: {new Date(miembro.joined_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    miembro.confirmado_general
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {miembro.confirmado_general ? '✅ Confirmado' : '⏳ Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Agregar miembros */}
          {totalMiembros < 4 && (
            <GestionMiembros
              grupoId={grupo.id}
              miembrosActuales={grupo.miembros || []}
              clientesDisponibles={clientesDisponibles || []}
            />
          )}
        </div>

        {/* Platos seleccionados */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🍽️ Platos Seleccionados</h2>
          
          {Object.keys(itemsPorFecha).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay platos seleccionados aún</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(itemsPorFecha)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, items]) => (
                  <div key={fecha} className="border-b pb-4">
                    <h3 className="font-bold text-gray-800 mb-2">
                      📅 {new Date(fecha).toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map((item: any) => (
                        <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-semibold text-gray-800">{item.plato?.nombre}</p>
                          <p className="text-xs text-gray-600">
                            {item.tipo_comida} · ${item.plato?.precio.toLocaleString('es-AR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

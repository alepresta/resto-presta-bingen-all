import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import GestionMiembros from './GestionMiembros';
import AccionesGrupo from '../AccionesGrupo';
import ProduccionPorDia from './ProduccionPorDia';

// Platos a preparar de un ítem = cantidad de personas que lo eligieron (votos),
// o la cantidad cargada, o 1 como mínimo.
function platosDeItem(item: any): number {
  const votos = Array.isArray(item.votos) ? item.votos.length : 0;
  return Math.max(votos, item.cantidad || 0, 1);
}

function normalizarAGramos(cantidad: number, unidad: string): number {
  const u = (unidad || '').toLowerCase();
  if (u === 'kg' || u === 'kilogramos') return cantidad * 1000;
  if (u === 'gramos' || u === 'g') return cantidad;
  if (u === 'litros' || u === 'l') return cantidad * 1000;
  if (u === 'ml' || u === 'mililitros') return cantidad;
  if (u === 'tazas') return cantidad * 240;
  if (u === 'cucharadas') return cantidad * 15;
  if (u === 'cucharadita' || u === 'cucharaditas') return cantidad * 5;
  if (u === 'unidades' || u === 'unidad') return cantidad * 100;
  return cantidad;
}

export default async function DetalleGrupoPage({ params }: { params: { id: string } }) {
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

  const { data: clientesDisponibles } = await supabase
    .from('clientes')
    .select('id, nombre, email')
    .order('nombre');

  const miembrosConfirmados = grupo.miembros?.filter((m: any) => m.confirmado_general).length || 0;
  const totalMiembros = grupo.miembros?.length || 0;

  const items = grupo.items || [];

  // Recetas + ingredientes de los platos elegidos (para la lista de compras por día)
  const platoIds = [...new Set(items.map((i: any) => i.plato_id).filter(Boolean))];
  const { data: recetas } = await supabase
    .from('recetas')
    .select('id, plato_id, porciones, pasos')
    .in('plato_id', platoIds.length ? platoIds : ['00000000-0000-0000-0000-000000000000']);

  const recetaPorPlato = new Map<string, { id: string; porciones: number; pasos: string[] }>();
  (recetas || []).forEach((r: any) => {
    const pasos = (Array.isArray(r.pasos) ? r.pasos : []).map((p: any) =>
      typeof p === 'string' ? p : p?.descripcion || p?.texto || p?.paso_texto || String(p ?? '')
    ).filter((s: string) => s && s.trim() !== '');
    recetaPorPlato.set(r.plato_id, { id: r.id, porciones: r.porciones || 1, pasos });
  });

  const recetaIds = (recetas || []).map((r: any) => r.id);
  const { data: recetaIngredientes } = await supabase
    .from('receta_ingredientes')
    .select('receta_id, cantidad, unidad, ingrediente:ingredientes(id, nombre, unidad_base, categoria)')
    .in('receta_id', recetaIds.length ? recetaIds : ['00000000-0000-0000-0000-000000000000']);

  const ingredientesPorReceta = new Map<string, any[]>();
  (recetaIngredientes || []).forEach((ri: any) => {
    const lista = ingredientesPorReceta.get(ri.receta_id) || [];
    lista.push(ri);
    ingredientesPorReceta.set(ri.receta_id, lista);
  });

  // Agrupar por fecha
  const fechas = [...new Set(items.map((i: any) => i.fecha))].sort();

  const resumenPorDia = fechas.map((fecha) => {
    const itemsDia = items.filter((i: any) => i.fecha === fecha);

    // Agregar platos por plato_id
    const platosMap = new Map<string, { platoId: string; nombre: string; precio: number; platos: number; subtotal: number; porcionesBase: number; pasos: string[]; ingredientes: { nombre: string; cantidad: number; unidad: string }[] }>();
    itemsDia.forEach((item: any) => {
      const n = platosDeItem(item);
      const precio = item.plato?.precio || 0;
      const key = item.plato_id;
      let prev = platosMap.get(key);
      if (!prev) {
        const receta = recetaPorPlato.get(key);
        const ingr = receta
          ? (ingredientesPorReceta.get(receta.id) || []).map((ri: any) => ({
              nombre: ri.ingrediente?.nombre || 'Ingrediente',
              cantidad: Number(ri.cantidad) || 0,
              unidad: ri.unidad || ri.ingrediente?.unidad_base || 'u',
            }))
          : [];
        prev = {
          platoId: key,
          nombre: item.plato?.nombre || 'Plato',
          precio,
          platos: 0,
          subtotal: 0,
          porcionesBase: receta?.porciones || 1,
          pasos: receta?.pasos || [],
          ingredientes: ingr,
        };
      }
      prev.platos += n;
      prev.subtotal = prev.precio * prev.platos;
      platosMap.set(key, prev);
    });
    const platosAgg = Array.from(platosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const totalDia = platosAgg.reduce((s, p) => s + p.subtotal, 0);

    // Lista de ingredientes agregada del día (escala cada receta por platos/porciones)
    const ingMap = new Map<string, { nombre: string; cantidad: number; unidad: string; categoria: string | null }>();
    itemsDia.forEach((item: any) => {
      const receta = recetaPorPlato.get(item.plato_id);
      if (!receta) return;
      const n = platosDeItem(item);
      const factor = n / (receta.porciones || 1);
      (ingredientesPorReceta.get(receta.id) || []).forEach((ri: any) => {
        const ing = ri.ingrediente;
        if (!ing) return;
        const unidad = ri.unidad || ing.unidad_base || 'g';
        const key = `${ing.nombre}|${unidad}`;
        const prev = ingMap.get(key) || { nombre: ing.nombre, cantidad: 0, unidad, categoria: ing.categoria || null };
        prev.cantidad += (Number(ri.cantidad) || 0) * factor;
        ingMap.set(key, prev);
      });
    });
    const ingredientes = Array.from(ingMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

    const totalPlatosDia = platosAgg.reduce((s, p) => s + p.platos, 0);

    return { fecha, platosAgg, totalDia, ingredientes, totalPlatosDia, conReceta: itemsDia.some((i: any) => recetaPorPlato.get(i.plato_id)) };
  });

  const totalGeneral = resumenPorDia.reduce((s, d) => s + d.totalDia, 0);
  const totalPlatosGeneral = resumenPorDia.reduce((s, d) => s + d.totalPlatosDia, 0);

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
            <Link href="/admin/pedidos/grupos" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold">
              ← Volver
            </Link>
            <Link href={`/pedidos/grupo/${grupo.id}`} className="bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-semibold" target="_blank">
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
            <p className="text-2xl font-bold">{totalMiembros}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-600 font-semibold">CONFIRMADOS</p>
            <p className="text-2xl font-bold">{miembrosConfirmados}/{totalMiembros}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
            <p className="text-xs text-gray-600 font-semibold">PLATOS A PREPARAR</p>
            <p className="text-2xl font-bold">{totalPlatosGeneral}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-600 font-semibold">TOTAL</p>
            <p className="text-2xl font-bold">${totalGeneral.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Acciones del grupo (confirmar / desconfirmar / cancelar / eliminar) */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">⚙️ Acciones del grupo</h2>
            <p className="text-sm text-gray-500">Confirmá o desconfirmá el pedido, o gestioná su estado.</p>
          </div>
          <AccionesGrupo grupoId={grupo.id} estado={grupo.estado} />
        </div>

        {/* Gestión de miembros (sin límite) */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">👥 Miembros del Grupo ({totalMiembros})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {grupo.miembros?.map((miembro: any) => (
              <div key={miembro.id} className={`p-4 rounded-lg border-2 ${miembro.confirmado_general ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{miembro.cliente?.nombre}</p>
                    <p className="text-sm text-gray-600">{miembro.cliente?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rol: {miembro.rol}{miembro.joined_at ? ` · Se unió: ${new Date(miembro.joined_at).toLocaleDateString('es-AR')}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${miembro.confirmado_general ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {miembro.confirmado_general ? '✅ Confirmado' : '⏳ Pendiente'}
                  </span>
                </div>
              </div>
            ))}
            {totalMiembros === 0 && (
              <p className="text-gray-500">Este grupo todavía no tiene miembros.</p>
            )}
          </div>

          <GestionMiembros
            grupoId={grupo.id}
            miembrosActuales={grupo.miembros || []}
            clientesDisponibles={clientesDisponibles || []}
          />
        </div>

        {/* Platos a preparar por día + ingredientes + lista de compras consolidada */}
        <ProduccionPorDia dias={resumenPorDia} />
      </main>
    </div>
  );
}

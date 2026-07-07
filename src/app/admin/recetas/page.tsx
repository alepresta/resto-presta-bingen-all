import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import DeleteButton from './DeleteButton';

export default async function AdminRecetasPage() {
  const supabase = createServerSupabaseClient();

  // 1. Obtener TODAS las recetas con sus platos
  const { data: recetas, error: errorRecetas } = await supabase
    .from('recetas')
    .select(`
      id,
      tiempo_min,
      porciones,
      dificultad,
      ingredientes,
      pasos,
      notas_hildegardianas,
      plato_id,
      platos:plato_id (id, nombre, categoria_id)
    `)
    .order('id', { ascending: false });

  // 2. Obtener TODOS los platos
  const { data: todosLosPlatos } = await supabase
    .from('platos')
    .select('id, nombre, categoria_id')
    .eq('disponible', true)
    .order('nombre');

  // 3. Filtrar platos sin receta manualmente
  const platosConReceta = new Set((recetas || []).map(r => r.plato_id));
  const platosSinReceta = (todosLosPlatos || []).filter(
    p => !platosConReceta.has(p.id)
  );

  // 4. Calcular cobertura
  const totalPlatos = todosLosPlatos?.length || 0;
  const totalRecetas = recetas?.length || 0;
  const cobertura = totalPlatos > 0 ? Math.round((totalRecetas / totalPlatos) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">📖 Gestión de Recetas</h1>
            <p className="text-amber-100 text-sm">Administra las recetas hildegardianas</p>
          </div>
          <Link
            href="/admin"
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            ← Volver al Panel
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error */}
        {errorRecetas && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error al cargar recetas:</strong> {errorRecetas.message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-gray-600 text-sm font-semibold">RECETAS CREADAS</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{totalRecetas}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
            <h3 className="text-gray-600 text-sm font-semibold">PLATOS SIN RECETA</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{platosSinReceta.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <h3 className="text-gray-600 text-sm font-semibold">COBERTURA</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{cobertura}%</p>
          </div>
        </div>

        {/* Botón Crear Nueva */}
        <div className="mb-6">
          <Link
            href="/admin/recetas/nueva"
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            ➕ Crear Nueva Receta
          </Link>
        </div>

        {/* Lista de Recetas */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Recetas Existentes ({totalRecetas})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {recetas?.map((receta: any) => {
              const nombrePlato = receta.platos?.[0]?.nombre || receta.platos?.nombre || 'Plato no encontrado';

              return (
                <div key={receta.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{nombrePlato}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                        <span>⏱️ {receta.tiempo_min} min</span>
                        <span>👥 {receta.porciones} porciones</span>
                        <span>📊 {receta.dificultad}</span>
                        <span>🥕 {receta.ingredientes?.length || 0} ingredientes</span>
                        <span>👨🍳 {receta.pasos?.length || 0} pasos</span>
                      </div>
                      {receta.notas_hildegardianas && (
                        <p className="text-sm text-amber-700 mt-2 italic line-clamp-2">
                          ✨ "{receta.notas_hildegardianas.substring(0, 150)}..."
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        href={`/admin/recetas/${receta.id}`}
                        className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-semibold text-sm"
                      >
                        ✏️ Editar
                      </Link>
                      <DeleteButton recetaId={receta.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {(!recetas || recetas.length === 0) && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg mb-4">No hay recetas creadas aún</p>
              <Link
                href="/admin/recetas/nueva"
                className="inline-block bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600"
              >
                Crear la primera receta
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

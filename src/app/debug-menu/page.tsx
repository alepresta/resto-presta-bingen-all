import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function DebugMenuPage() {
  const supabase = createServerSupabaseClient();

  // 1. Obtener restaurante
  const { data: restaurante, error: errorRest } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', 'resto-presta-bingen-all')
    .single();

  // 2. Día actual
  const hoy = new Date();
  const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();

  // 3. Obtener categorías
  const { data: categorias, error: errorCat } = await supabase
    .from('categorias_plato')
    .select('*')
    .order('orden');

  // 4. Probar consulta de platos SIN filtros
  const { data: todosLosPlatos, error: errorPlatos } = await supabase
    .from('platos')
    .select('*')
    .limit(5);

  // 5. Probar consulta CON filtros (como en la página real)
  const { data: platosFiltrados, error: errorFiltros } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', restaurante?.id || '')
    .eq('disponible', true)
    .limit(5);

  // 6. Verificar platos del viernes (día 5)
  const { data: platosViernes, error: errorViernes } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', restaurante?.id || '')
    .eq('dia_semana_id', 5)
    .eq('disponible', true);

  // 7. Verificar platos disponibles todos los días
  const { data: platosTodosDias, error: errorTodosDias } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', restaurante?.id || '')
    .eq('disponible_todos_dias', true)
    .eq('disponible', true)
    .limit(5);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug del Menú</h1>

      {/* Restaurante */}
      <div className="bg-blue-50 p-4 rounded mb-4">
        <h2 className="font-bold text-lg mb-2">1. Restaurante</h2>
        <p>ID: {restaurante?.id}</p>
        <p>Nombre: {restaurante?.nombre}</p>
        <p>Slug: {restaurante?.slug}</p>
        {errorRest && <p className="text-red-600">Error: {errorRest.message}</p>}
      </div>

      {/* Día actual */}
      <div className="bg-purple-50 p-4 rounded mb-4">
        <h2 className="font-bold text-lg mb-2">2. Día actual</h2>
        <p>Número: {diaSemana}</p>
        <p>Nombre: {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana === 7 ? 0 : diaSemana]}</p>
      </div>

      {/* Categorías */}
      <div className="bg-green-50 p-4 rounded mb-4">
        <h2 className="font-bold text-lg mb-2">3. Categorías</h2>
        <pre className="bg-white p-2 rounded overflow-auto text-sm">
          {JSON.stringify(categorias, null, 2)}
        </pre>
        {errorCat && <p className="text-red-600">Error: {errorCat.message}</p>}
      </div>

      {/* Todos los platos (sin filtros) */}
      <div className="bg-yellow-50 p-4 rounded mb-4">
        <h2 className="font-bold text-lg mb-2">4. Todos los platos (sin filtros, límite 5)</h2>
        <p>Cantidad: {todosLosPlatos?.length || 0}</p>
        <pre className="bg-white p-2 rounded overflow-auto text-sm">
          {JSON.stringify(todosLosPlatos, null, 2)}
        </pre>
        {errorPlatos && <p className="text-red-600">Error: {errorPlatos.message}</p>}
      </div>

      {/* Platos filtrados */}
      <div className="bg-orange-50 p-4 rounded mb-4">
        <h2 className="font-bold text-lg mb-2">5. Platos filtrados (restaurante_id + disponible=true)</h2>
        <p>Cantidad: {platosFiltrados?.length || 0}</p>
        <pre className="bg-white p-2 rounded overflow-auto text-sm">
          {JSON.stringify(platosFiltrados, null, 2)}
        </pre>
        {errorFiltros && <p className="text-red-600">Error: {errorFiltros.message}</p>}
      </div>

      {/* Platos del viernes */}
      <div className="bg-red-50 p-4 rounded mb-4">
        <h2 className="font-bold text-lg mb-2">6. Platos del viernes (día 5)</h2>
        <p>Cantidad: {platosViernes?.length || 0}</p>
        <pre className="bg-white p-2 rounded overflow-auto text-sm">
          {JSON.stringify(platosViernes, null, 2)}
        </pre>
        {errorViernes && <p className="text-red-600">Error: {errorViernes.message}</p>}
      </div>

      {/* Platos todos los días */}
      <div className="bg-pink-50 p-4 rounded mb-4">
        <h2 className="font-bold text-lg mb-2">7. Platos disponibles todos los días</h2>
        <p>Cantidad: {platosTodosDias?.length || 0}</p>
        <pre className="bg-white p-2 rounded overflow-auto text-sm">
          {JSON.stringify(platosTodosDias, null, 2)}
        </pre>
        {errorTodosDias && <p className="text-red-600">Error: {errorTodosDias.message}</p>}
      </div>
    </div>
  );
}

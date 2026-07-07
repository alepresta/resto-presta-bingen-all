import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function AdminIngredientesPage({
  searchParams,
}: {
  searchParams?: { categoria?: string; q?: string };
}) {
  const supabase = createServerSupabaseClient();
  const categoria = searchParams?.categoria;
  const busqueda = searchParams?.q;

  // Construir query con filtros - AHORA TRAEMOS MÁS COLUMNAS
  let query = supabase
    .from('ingredientes')
    .select(`
      id, nombre, categoria, unidad_base, activo,
      calorias, proteinas_g, carbohidratos_g, grasas_g, fibra_g,
      calcio_mg, hierro_mg, potasio_mg,
      vitamina_a_mcg, vitamina_c_mg,
      indice_glucemico, origen, temperamento
    `)
    .order('nombre');

  if (categoria && categoria !== 'todos') {
    query = query.eq('categoria', categoria);
  }

  if (busqueda) {
    query = query.ilike('nombre', `%${busqueda}%`);
  }

  const { data: ingredientes, error } = await query;

  // Contar por categoría
  const { data: conteoCategorias } = await supabase
    .from('ingredientes')
    .select('categoria')
    .eq('activo', true);

  const conteoPorCategoria = (conteoCategorias || []).reduce((acc: any, ing: any) => {
    acc[ing.categoria] = (acc[ing.categoria] || 0) + 1;
    return acc;
  }, {});

  const categorias = [
    { id: 'verduras', icono: '🥕', nombre: 'Verduras' },
    { id: 'frutas', icono: '🍎', nombre: 'Frutas' },
    { id: 'carnes', icono: '🥩', nombre: 'Carnes' },
    { id: 'pescados', icono: '🐟', nombre: 'Pescados' },
    { id: 'lacteos', icono: '🧀', nombre: 'Lácteos' },
    { id: 'granos', icono: '🌾', nombre: 'Granos' },
    { id: 'legumbres', icono: '🫘', nombre: 'Legumbres' },
    { id: 'condimentos', icono: '🧂', nombre: 'Condimentos' },
    { id: 'aceites', icono: '🫒', nombre: 'Aceites' },
    { id: 'bebidas', icono: '🥤', nombre: 'Bebidas' },
    { id: 'hierbas', icono: '🌿', nombre: 'Hierbas' },
    { id: 'especias', icono: '🌶️', nombre: 'Especias' },
    { id: 'endulzantes', icono: '🍯', nombre: 'Endulzantes' },
    { id: 'frutos_secos', icono: '🥜', nombre: 'Frutos Secos' },
    { id: 'otros', icono: '📦', nombre: 'Otros' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🥕 Gestión de Ingredientes</h1>
            <p className="text-green-100 text-sm">Catálogo maestro con info nutricional completa</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              ← Panel
            </Link>
            <Link
              href="/admin/ingredientes/nuevo"
              className="bg-white text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              ➕ Nuevo
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-600 font-semibold">TOTAL</p>
            <p className="text-2xl font-bold">{ingredientes?.length || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
            <p className="text-xs text-gray-600 font-semibold">CATEGORÍAS</p>
            <p className="text-2xl font-bold">{Object.keys(conteoPorCategoria).length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-xs text-gray-600 font-semibold">CON CALORÍAS</p>
            <p className="text-2xl font-bold">
              {ingredientes?.filter((i) => i.calorias !== null).length || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
            <p className="text-xs text-gray-600 font-semibold">CON IG</p>
            <p className="text-2xl font-bold">
              {ingredientes?.filter((i) => i.indice_glucemico !== null).length || 0}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <form className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              name="q"
              defaultValue={busqueda}
              placeholder="🔍 Buscar ingrediente..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <select
              name="categoria"
              defaultValue={categoria || 'todos'}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="todos">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono} {cat.nombre} ({conteoPorCategoria[cat.id] || 0})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
            >
              Filtrar
            </button>
            {(busqueda || categoria) && (
              <Link
                href="/admin/ingredientes"
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold text-center"
              >
                Limpiar
              </Link>
            )}
          </form>
        </div>

        {/* Lista de ingredientes - TABLA EXPANDIDA */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Categoría</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">🔥 Cal</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">💪 Prot</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">🍞 Carbs</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">🥑 Grasas</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">🌾 Fibra</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">⚗️ Ca/Fe</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">💊 Vit A/C</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">📊 IG</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ingredientes?.map((ing: any) => {
                  const catInfo = categorias.find((c) => c.id === ing.categoria);
                  return (
                    <tr key={ing.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <div className="flex items-center gap-2">
                          <span>{ing.nombre}</span>
                          {ing.origen && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {ing.origen === 'vegetal' ? '🌱' : ing.origen === 'animal' ? '🐄' : '⚗️'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs font-semibold">
                          {catInfo?.icono} {catInfo?.nombre || ing.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${ing.calorias !== null ? 'text-amber-600' : 'text-gray-400'}`}>
                          {ing.calorias !== null ? ing.calorias : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={ing.proteinas_g !== null ? 'text-blue-600' : 'text-gray-400'}>
                          {ing.proteinas_g !== null ? ing.proteinas_g : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={ing.carbohidratos_g !== null ? 'text-orange-600' : 'text-gray-400'}>
                          {ing.carbohidratos_g !== null ? ing.carbohidratos_g : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={ing.grasas_g !== null ? 'text-yellow-600' : 'text-gray-400'}>
                          {ing.grasas_g !== null ? ing.grasas_g : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={ing.fibra_g !== null ? 'text-green-600' : 'text-gray-400'}>
                          {ing.fibra_g !== null ? ing.fibra_g : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <div className={ing.calcio_mg !== null || ing.hierro_mg !== null ? 'text-gray-700' : 'text-gray-400'}>
                          {ing.calcio_mg !== null ? `${ing.calcio_mg}` : '-'} / {ing.hierro_mg !== null ? ing.hierro_mg : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <div className={ing.vitamina_a_mcg !== null || ing.vitamina_c_mg !== null ? 'text-gray-700' : 'text-gray-400'}>
                          {ing.vitamina_a_mcg !== null ? ing.vitamina_a_mcg : '-'} / {ing.vitamina_c_mg !== null ? ing.vitamina_c_mg : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ing.indice_glucemico !== null ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            ing.indice_glucemico < 55 ? 'bg-green-100 text-green-700' :
                            ing.indice_glucemico < 70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {ing.indice_glucemico}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/ingredientes/${ing.id}`}
                          className="text-green-600 hover:text-green-800 font-semibold text-sm"
                        >
                          ✏️ Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(!ingredientes || ingredientes.length === 0) && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">No se encontraron ingredientes</p>
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-2">📖 Leyenda de columnas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
            <div><span className="font-semibold">🔥 Cal:</span> Calorías (kcal/100g)</div>
            <div><span className="font-semibold">💪 Prot:</span> Proteínas (g/100g)</div>
            <div><span className="font-semibold">🍞 Carbs:</span> Carbohidratos (g/100g)</div>
            <div><span className="font-semibold">🥑 Grasas:</span> Grasas totales (g/100g)</div>
            <div><span className="font-semibold">🌾 Fibra:</span> Fibra dietética (g/100g)</div>
            <div><span className="font-semibold">⚗️ Ca/Fe:</span> Calcio/Hierro (mg/100g)</div>
            <div><span className="font-semibold">💊 Vit A/C:</span> Vitamina A/C (mcg/mg)</div>
            <div><span className="font-semibold">📊 IG:</span> Índice Glucémico (0-100)</div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import TablaIngredientes from './TablaIngredientes';

export default async function AdminIngredientesPage({
  searchParams,
}: {
  searchParams?: { categoria?: string; q?: string };
}) {
  const supabase = createServerSupabaseClient();
  const categoria = searchParams?.categoria;
  const busqueda = searchParams?.q;

  // Construir query con filtros - TRAEMOS TODAS LAS COLUMNAS DE LA BD
  let query = supabase
    .from('ingredientes')
    .select('*')
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
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500 text-gray-900">
            <p className="text-xs text-gray-700 font-semibold">TOTAL</p>
            <p className="text-3xl font-extrabold text-gray-900 leading-none" style={{ color: '#111827', opacity: 1 }}>
              {ingredientes?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500 text-gray-900">
            <p className="text-xs text-gray-700 font-semibold">CATEGORÍAS</p>
            <p className="text-3xl font-extrabold text-gray-900 leading-none" style={{ color: '#111827', opacity: 1 }}>
              {Object.keys(conteoPorCategoria).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500 text-gray-900">
            <p className="text-xs text-gray-700 font-semibold">CON CALORÍAS</p>
            <p className="text-3xl font-extrabold text-gray-900 leading-none" style={{ color: '#111827', opacity: 1 }}>
              {ingredientes?.filter((i) => i.calorias !== null).length || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500 text-gray-900">
            <p className="text-xs text-gray-700 font-semibold">CON IG</p>
            <p className="text-3xl font-extrabold text-gray-900 leading-none" style={{ color: '#111827', opacity: 1 }}>
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

        {/* Lista de ingredientes - TABLA COMPLETA con selector de grupos de columnas */}
        <TablaIngredientes ingredientes={ingredientes || []} categorias={categorias} />

        {/* Leyenda */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-2">📖 Leyenda de columnas</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <p><span className="font-semibold text-gray-700">General:</span> 🔬 Nombre científico · 🧬 Origen (vegetal/animal/mineral) · 📏 Unidad base · 🌱 Parte útil · 📅 Estacionalidad</p>
            <p><span className="font-semibold text-amber-700">Macros:</span> 🔥 Cal (kcal) · 💪 Prot · 🍞 Carbs · 🥑 Grasas · 🌾 Fibra · 🍬 Azúcar · 💧 Agua · ⬜ Cenizas · 🍷 Alcohol · ☕ Cafeína (por 100 g)</p>
            <p><span className="font-semibold text-yellow-700">Grasas:</span> Sat · Mono · Poli (g) · Ω3 · Ω6 · Colest (mg)</p>
            <p><span className="font-semibold text-slate-700">Minerales:</span> Na, K, Ca, Mg, P, Fe, Zn, Cu, Mn, Cl, S (mg) · Se, I, F (mcg)</p>
            <p><span className="font-semibold text-pink-700">Vitaminas:</span> A, D, K, B9, B12 (mcg) · C, E, B1, B2, B3, B5, B6 (mg)</p>
            <p><span className="font-semibold text-purple-700">Índices:</span> 📊 IG (Índice Glucémico 0-100) · CG (Carga Glucémica) · ORAC (antioxidantes) · PRAL (carga ácida renal) · pH</p>
            <p><span className="font-semibold text-emerald-700">Hildegarda:</span> 🌿 Temperamento · ✨ Subtilitas (fuerza vital 1-10) · ☠️ Veneno · 😊 Base de alegría · 🔥 Requiere cocción · ⚠️ Alérgenos · 📜 Propiedades · 💚 Beneficios · 🚫 Contraindicaciones · 🔄 Alternativa sana</p>
          </div>
        </div>
      </main>
    </div>
  );
}

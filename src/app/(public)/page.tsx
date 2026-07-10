import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const SLUG = 'resto-presta-bingen-all';

interface RecetaRel {
  notas_hildegardianas: string | null;
  tiempo_min: number | null;
  dificultad: string | null;
  ingredientes: { nombre: string }[] | null;
}

interface PlatoDestacado {
  id: string;
  nombre: string;
  descripcion: string | null;
  propiedades_hildegardianas: string | null;
  recetas: RecetaRel | RecetaRel[] | null;
}

function primeraReceta(recetas: PlatoDestacado['recetas']): RecetaRel | null {
  if (!recetas) return null;
  return Array.isArray(recetas) ? recetas[0] ?? null : recetas;
}

async function obtenerDatosHome() {
  const supabase = createServerSupabaseClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, nombre, tagline')
    .eq('slug', SLUG)
    .single();

  if (!restaurante) {
    return { totalPlatos: 0, totalRecetas: 0, cobertura: 0, destacados: [] as PlatoDestacado[] };
  }

  const [{ count: totalPlatos }, { count: totalRecetas }, { data: destacados }] = await Promise.all([
    supabase
      .from('platos')
      .select('id', { count: 'exact', head: true })
      .eq('restaurante_id', restaurante.id)
      .eq('disponible', true),
    supabase.from('recetas').select('id', { count: 'exact', head: true }),
    supabase
      .from('platos')
      .select(
        'id, nombre, descripcion, propiedades_hildegardianas, recetas:recetas(notas_hildegardianas, tiempo_min, dificultad, ingredientes)'
      )
      .eq('restaurante_id', restaurante.id)
      .eq('disponible', true)
      .eq('es_estrella', true)
      .order('orden', { ascending: true })
      .limit(6),
  ]);

  const platos = totalPlatos ?? 0;
  const recetas = totalRecetas ?? 0;
  const cobertura = platos > 0 ? Math.min(100, Math.round((recetas / platos) * 100)) : 0;

  return {
    totalPlatos: platos,
    totalRecetas: recetas,
    cobertura,
    destacados: (destacados as PlatoDestacado[]) || [],
  };
}

export default async function HomePage() {
  const { totalPlatos, totalRecetas, cobertura, destacados } = await obtenerDatosHome();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="bg-gradient-to-br from-amber-700 via-amber-600 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-5xl md:text-6xl font-bold font-serif mb-4">
            RESTO PRESTA BINGEN ALL
          </h1>
          <p className="text-2xl italic text-amber-100 mb-2">
            &ldquo;Comida es Medicina&rdquo;
          </p>
          <p className="text-lg opacity-90 mb-8">
            Cocina hildegardiana • Análisis nutricional científico y hildegardiano
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/menu/${SLUG}`} className="btn-primary">
              🍽️ Ver Menú
            </Link>
            <Link href="/pedidos/crear" className="btn-secondary">
              📅 Hacer Pedido
            </Link>
          </div>
        </div>
      </header>

      {/* Métricas dinámicas */}
      <section className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-6 text-center">
            <p className="text-3xl md:text-4xl font-bold text-amber-700">{totalPlatos}</p>
            <p className="text-sm text-gray-600 mt-1">Platos disponibles</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-3xl md:text-4xl font-bold text-green-700">{totalRecetas}</p>
            <p className="text-sm text-gray-600 mt-1">Recetas documentadas</p>
          </div>
          <div className="card p-6 text-center">
            <p className="text-3xl md:text-4xl font-bold text-emerald-700">{cobertura}%</p>
            <p className="text-sm text-gray-600 mt-1">Cobertura de recetas</p>
          </div>
        </div>
      </section>

      {/* Los 3 pilares del análisis */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold font-serif mb-3">Nuestro método</h2>
          <p className="text-lg text-gray-600">
            Cada plato se evalúa con una doble mirada: la ciencia nutricional moderna y la sabiduría de Hildegarda.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Análisis nutricional científico */}
          <div className="card p-8 flex flex-col">
            <div className="text-5xl mb-4">🔬</div>
            <h3 className="text-xl font-bold mb-2">Análisis Nutricional Científico</h3>
            <p className="text-gray-600 flex-1">
              Calculamos calorías, macros (proteínas, carbohidratos, grasas), fibra, minerales y
              vitaminas de cada receta, comparándolos con los valores diarios recomendados (VDR)
              para detectar excesos y déficits.
            </p>
            <ul className="text-sm text-gray-500 mt-4 space-y-1">
              <li>• Macros y micronutrientes por porción</li>
              <li>• Alertas de exceso y déficit vs. VDR</li>
              <li>• Promedios diarios del período</li>
            </ul>
          </div>

          {/* Análisis nutricional hildegardiano */}
          <div className="card p-8 flex flex-col border-t-4 border-amber-500">
            <div className="text-5xl mb-4">🌿</div>
            <h3 className="text-xl font-bold mb-2">Análisis Nutricional Hildegardiano</h3>
            <p className="text-gray-600 flex-1">
              Según <em>Physica</em> y <em>Causae et Curae</em>: evaluamos <strong>Viriditas</strong>,{' '}
              <strong>Eucrasia</strong> (balance cálido/frío, seco/húmedo), venenos de cocina,
              pilares de vigor y maduración por fuego.
            </p>
            <ul className="text-sm text-gray-500 mt-4 space-y-1">
              <li>• Subtilitat y Viriditas</li>
              <li>• Detección de venenos de cocina</li>
              <li>• Pilares: espelta, hinojo, galanga, castañas</li>
            </ul>
          </div>

          {/* Recetas */}
          <div className="card p-8 flex flex-col">
            <div className="text-5xl mb-4">📖</div>
            <h3 className="text-xl font-bold mb-2">Recetas</h3>
            <p className="text-gray-600 flex-1">
              Cada receta detalla ingredientes, cantidades, pasos y notas hildegardianas.
              Son la base de todos los cálculos: sin receta no hay análisis.
            </p>
            <ul className="text-sm text-gray-500 mt-4 space-y-1">
              <li>• Ingredientes con cantidades y unidades</li>
              <li>• Tiempo, porciones y dificultad</li>
              <li>• Notas y propiedades hildegardianas</li>
            </ul>
            <Link href={`/menu/${SLUG}`} className="text-amber-700 font-semibold mt-4 hover:underline">
              Explorar recetas del menú →
            </Link>
          </div>
        </div>
      </section>

      {/* Recetas destacadas reales */}
      {destacados.length > 0 && (
        <section className="bg-gradient-to-r from-green-50 to-amber-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold font-serif mb-3">⭐ Recetas destacadas</h2>
              <p className="text-lg text-gray-600">
                Especialidades de la casa con propiedades curativas específicas.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {destacados.map((plato) => {
                const receta = primeraReceta(plato.recetas);
                const nota = receta?.notas_hildegardianas || plato.propiedades_hildegardianas;
                return (
                  <div key={plato.id} className="card p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{plato.nombre}</h3>
                    {plato.descripcion && (
                      <p className="text-sm text-gray-600 line-clamp-2">{plato.descripcion}</p>
                    )}
                    {nota && (
                      <p className="text-sm text-amber-700 italic mt-3 line-clamp-3">✨ {nota}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                      {receta?.tiempo_min ? <span>⏱️ {receta.tiempo_min} min</span> : null}
                      {receta?.dificultad ? <span>📊 {receta.dificultad}</span> : null}
                      {receta?.ingredientes?.length ? (
                        <span>🥕 {receta.ingredientes.length} ingredientes</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <Link href={`/menu/${SLUG}`} className="btn-primary">
                Ver todo el menú
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Viriditas */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold font-serif mb-6">Viriditas</h2>
        <p className="text-xl text-gray-700 leading-relaxed">
          La fuerza vital verde que Hildegarda describía como el poder sanador
          de la naturaleza. Cada plato está preparado con <strong>espelta</strong>,{' '}
          <strong>hierbas medicinales</strong> e <strong>ingredientes de estación</strong>{' '}
          para nutrir cuerpo y alma.
        </p>
      </section>
    </div>
  );
}

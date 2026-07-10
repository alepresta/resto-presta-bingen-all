import { createServerSupabaseClient } from '@/lib/supabase-server';
import ListaPlatos from './ListaPlatos';
import { analizarPlato, normalizarAGramos, type RecetaIngredienteEntrada } from '@/lib/analisis-plato';

export default async function AdminPlatosPage() {
  const supabase = createServerSupabaseClient();

  // PASO 1: Obtener TODOS los platos (publicados y no publicados) para gestión
  const { data: platosBasicos, error: errorPlatos } = await supabase
    .from('platos')
    .select('*')
    .order('nombre');

  if (errorPlatos) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          ❌ Error: {errorPlatos.message}
        </div>
      </div>
    );
  }

  // PASO 2: Obtener recetas de todos los platos
  const { data: recetas } = await supabase
    .from('recetas')
    .select('id, plato_id, porciones');

  const recetasPorPlato = new Map<string, { id: string; porciones: number | null }>();
  (recetas || []).forEach((r) => recetasPorPlato.set(r.plato_id, { id: r.id, porciones: r.porciones }));

  // PASO 3: Obtener los ingredientes con datos nutricionales de todas las recetas
  const recetaIds = (recetas || []).map((r) => r.id);
  const { data: recetaIngredientes } = await supabase
    .from('receta_ingredientes')
    .select(`
      receta_id, cantidad, unidad,
      ingrediente:ingredientes(
        id, nombre,
        calorias, proteinas_g, carbohidratos_g, grasas_g, grasas_saturadas_g, fibra_g, azucar_g,
        sodio_mg, calcio_mg, hierro_mg, magnesio_mg, potasio_mg, zinc_mg, fosforo_mg,
        vitamina_a_mcg, vitamina_c_mg, vitamina_d_mcg, vitamina_e_mg, vitamina_k_mcg,
        vitamina_b1_mg, vitamina_b2_mg, vitamina_b3_mg, vitamina_b5_mg,
        vitamina_b6_mg, vitamina_b9_mcg, vitamina_b12_mcg,
        es_veneno_hildegardiano, es_base_alegria, nivel_subtilitat, requiere_coccion,
        temperamento, propiedades_hildegardianas, indice_glucemico
      )
    `)
    .in('receta_id', recetaIds.length ? recetaIds : ['00000000-0000-0000-0000-000000000000']);

  const ingredientesPorReceta = new Map<string, RecetaIngredienteEntrada[]>();
  (recetaIngredientes || []).forEach((ri: any) => {
    const lista = ingredientesPorReceta.get(ri.receta_id) || [];
    lista.push({ cantidad: ri.cantidad, unidad: ri.unidad, ingrediente: ri.ingrediente || null });
    ingredientesPorReceta.set(ri.receta_id, lista);
  });

  // PASO 4: Combinar platos con su receta + análisis nutricional dinámico
  const platos = (platosBasicos || []).map((plato) => {
    const receta = recetasPorPlato.get(plato.id) || null;
    const ingredientes = receta ? ingredientesPorReceta.get(receta.id) || [] : [];
    const analisis = receta ? analizarPlato(ingredientes, receta.porciones || 1) : null;

    // Índice glucémico del plato: promedio ponderado por gramos de los
    // ingredientes que tienen IG cargado.
    let igPeso = 0;
    let igPonderado = 0;
    ingredientes.forEach((ri) => {
      const ig = (ri.ingrediente as any)?.indice_glucemico;
      if (ig === null || ig === undefined) return;
      const gramos = normalizarAGramos(ri.cantidad || 0, ri.unidad || '');
      const peso = gramos > 0 ? gramos : 1;
      igPeso += peso;
      igPonderado += Number(ig) * peso;
    });
    const indiceGlucemico = igPeso > 0 ? Math.round(igPonderado / igPeso) : null;

    return {
      ...plato,
      indiceGlucemico,
      receta: receta
        ? { id: receta.id, ingredientes: ingredientes.map((i) => ({ ingrediente: i.ingrediente })) }
        : null,
      analisis,
    };
  });

  return <ListaPlatos platos={platos} />;
}


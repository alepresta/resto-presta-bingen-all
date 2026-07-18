import { createServerSupabaseClient } from '@/lib/supabase-server';
import ListaRecetas from './ListaRecetas';
import { analizarPlato, normalizarAGramos, type RecetaIngredienteEntrada } from '@/lib/analisis-plato';

export const dynamic = 'force-dynamic';

const RECETA_INGREDIENTES_PAGE_SIZE = 1000;

async function cargarRecetaIngredientes(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  recetaIds: string[]
) {
  if (recetaIds.length === 0) return [];

  const acumulado: any[] = [];

  for (let desde = 0; ; desde += RECETA_INGREDIENTES_PAGE_SIZE) {
    const hasta = desde + RECETA_INGREDIENTES_PAGE_SIZE - 1;
    const { data, error } = await supabase
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
      .in('receta_id', recetaIds)
      .range(desde, hasta);

    if (error) throw error;

    const pagina = data || [];
    acumulado.push(...pagina);

    if (pagina.length < RECETA_INGREDIENTES_PAGE_SIZE) {
      break;
    }
  }

  return acumulado;
}

export default async function AdminRecetasPage() {
  const supabase = createServerSupabaseClient();

  // 1. Recetas con datos de su plato
  const { data: recetas, error: errorRecetas } = await supabase
    .from('recetas')
    .select(`
      id, tiempo_min, porciones, estado, dificultad, ingredientes, pasos, notas_hildegardianas, plato_id,
      plato:plato_id ( id, nombre, categoria_id, disponible, precio, dia_semana_id, alergenos )
    `)
    .order('id', { ascending: false });

  // 2. Total de platos (para cobertura)
  const { data: todosLosPlatos } = await supabase
    .from('platos')
    .select('id')
    .eq('disponible', true);

  // 3. Ingredientes con datos nutricionales de todas las recetas
  const recetaIds = (recetas || []).map((r) => r.id);
  const recetaIngredientes = await cargarRecetaIngredientes(supabase, recetaIds);

  const ingredientesPorReceta = new Map<string, RecetaIngredienteEntrada[]>();
  (recetaIngredientes || []).forEach((ri: any) => {
    const lista = ingredientesPorReceta.get(ri.receta_id) || [];
    lista.push({ cantidad: ri.cantidad, unidad: ri.unidad, ingrediente: ri.ingrediente || null });
    ingredientesPorReceta.set(ri.receta_id, lista);
  });

  // 4. Enriquecer cada receta con plato + análisis + IG
  const recetasEnriquecidas = (recetas || []).map((r: any) => {
    const plato = Array.isArray(r.plato) ? r.plato[0] : r.plato;
    const ingredientes = ingredientesPorReceta.get(r.id) || [];
    const analisis = analizarPlato(ingredientes, r.porciones || 1);
    const ingredientesValidos = ingredientes.filter((i) => i.ingrediente);

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
      id: r.id,
      nombrePlato: plato?.nombre ?? 'Plato no encontrado',
      categoria_id: plato?.categoria_id ?? 0,
      disponible: !!plato?.disponible,
      precio: plato?.precio ?? null,
      dia_semana_id: plato?.dia_semana_id ?? null,
      alergenos: plato?.alergenos ?? [],
      tiempo_min: r.tiempo_min ?? null,
      porciones: r.porciones ?? null,
      estado: r.estado ?? 'borrador',
      dificultad: r.dificultad ?? null,
      numIngredientes: ingredientesValidos.length || (Array.isArray(r.ingredientes) ? r.ingredientes.length : 0),
      numPasos: Array.isArray(r.pasos) ? r.pasos.length : 0,
      notas: r.notas_hildegardianas ?? null,
      ingredientes: ingredientesValidos.map((i) => ({ ingrediente: i.ingrediente as any })),
      analisis,
      indiceGlucemico,
    };
  });

  const totalPlatos = todosLosPlatos?.length || 0;
  const totalRecetas = recetasEnriquecidas.length;
  const platosConReceta = new Set((recetas || []).map((r) => r.plato_id));
  const platosSinReceta = Math.max(0, totalPlatos - platosConReceta.size);
  const cobertura = totalPlatos > 0 ? Math.round((totalRecetas / totalPlatos) * 100) : 0;

  return (
    <ListaRecetas
      recetas={recetasEnriquecidas}
      totalRecetas={totalRecetas}
      platosSinReceta={platosSinReceta}
      cobertura={cobertura}
      error={errorRecetas?.message ?? null}
    />
  );
}

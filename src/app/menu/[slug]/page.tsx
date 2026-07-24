import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import MenuVisual from './MenuVisual';
import { analizarPlato, type RecetaIngredienteEntrada } from '@/lib/analisis-plato';
import { diasSemanaDesdeLegado } from '@/lib/plato-dias';

interface PageProps {
  params: {
    slug: string;
  };
}

const RESTAURANTE_SLUG_FALLBACK = 'resto-presta-bingen-all';

// Mapa de categorías de ingredientes destacables → tag mostrado en la tarjeta.
// Solo se usa como respaldo cuando el plato no tiene tags curados.
const MAPA_CATEGORIA_TAG: Record<string, string> = {
  pescados: 'pescado',
  carnes: 'carne',
  frutas: 'fruta',
  verduras: 'verdura',
  lacteos: 'lácteo',
  legumbres: 'legumbre',
  granos: 'grano',
  frutos_secos: 'frutos secos',
  hierbas: 'hierbas',
  especias: 'especias',
};

export default async function MenuPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();

  // 1. Obtener el restaurante
  const { data: restauranteEncontrado } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  let restaurante = restauranteEncontrado;
  if (!restaurante) {
    const { data: restauranteFallback } = await supabase
      .from('restaurantes')
      .select('*')
      .eq('slug', RESTAURANTE_SLUG_FALLBACK)
      .maybeSingle();

    if (restauranteFallback) {
      restaurante = restauranteFallback;
    }
  }

  if (!restaurante) {
    const { data: primerRestaurante } = await supabase
      .from('restaurantes')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    restaurante = primerRestaurante;
  }

  if (!restaurante) {
    notFound();
  }

  // 2. Obtener el día actual
  const hoy = new Date();
  const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();

  // 3. Obtener información del día
  const { data: diaInfo } = await supabase
    .from('dias_semana')
    .select('*')
    .eq('id', diaSemana)
    .single();

  // 4. Obtener todas las categorías
  const { data: categorias } = await supabase
    .from('categorias_plato')
    .select('*')
    .order('orden');

  // 5. Obtener TODOS los platos del restaurante
  const { data: platos } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', restaurante.id)
    .eq('disponible', true)
    .order('categoria_id')
    .order('orden');

  const platoIds = (platos || []).map((p) => p.id);
  const { data: platosDiasData } = await supabase
    .from('plato_dias')
    .select('plato_id, dia_semana_id')
    .in('plato_id', platoIds.length ? platoIds : ['00000000-0000-0000-0000-000000000000']);

  const diasPorPlato = new Map<string, number[]>();
  (platosDiasData || []).forEach((row: any) => {
    const lista = diasPorPlato.get(row.plato_id) || [];
    lista.push(row.dia_semana_id);
    diasPorPlato.set(row.plato_id, lista);
  });

  // 6. Obtener las recetas de los platos de este restaurante
  const { data: recetas } = await supabase
    .from('recetas')
    .select('*')
    .in('plato_id', platoIds.length ? platoIds : ['00000000-0000-0000-0000-000000000000']);

  // 7. Crear un mapa de recetas por plato_id
  const recetasMap = new Map();
  if (recetas) {
    recetas.forEach(receta => {
      recetasMap.set(receta.plato_id, receta);
    });
  }

  // 7b. Obtener los ingredientes con datos nutricionales de todas las recetas.
  //     Se pagina porque Supabase limita las respuestas a 1000 filas por defecto
  //     y un menú puede superar ese número de líneas de receta.
  const recetaIds = (recetas || []).map((r) => r.id);
  const recetaIngredientes: any[] = [];
  if (recetaIds.length) {
    const PAGE = 1000;
    for (let desde = 0; ; desde += PAGE) {
      const { data: pagina, error } = await supabase
        .from('receta_ingredientes')
        .select(`
          receta_id, cantidad, unidad,
          ingrediente:ingredientes(
            id, nombre, categoria, alergenos,
            calorias, proteinas_g, carbohidratos_g, grasas_g, grasas_saturadas_g, fibra_g, azucar_g,
            sodio_mg, calcio_mg, hierro_mg, magnesio_mg, potasio_mg, zinc_mg, fosforo_mg,
            vitamina_a_mcg, vitamina_c_mg, vitamina_d_mcg, vitamina_e_mg, vitamina_k_mcg,
            vitamina_b1_mg, vitamina_b2_mg, vitamina_b3_mg, vitamina_b5_mg,
            vitamina_b6_mg, vitamina_b9_mcg, vitamina_b12_mcg,
            es_veneno_hildegardiano, es_base_alegria, nivel_subtilitat, requiere_coccion,
            temperamento, propiedades_hildegardianas
          )
        `)
        .in('receta_id', recetaIds)
        .range(desde, desde + PAGE - 1);
      if (error || !pagina || pagina.length === 0) break;
      recetaIngredientes.push(...pagina);
      if (pagina.length < PAGE) break;
    }
  }

  // 7c. Agrupar ingredientes por receta
  const ingredientesPorReceta = new Map<string, RecetaIngredienteEntrada[]>();
  (recetaIngredientes || []).forEach((ri: any) => {
    const lista = ingredientesPorReceta.get(ri.receta_id) || [];
    lista.push({
      cantidad: ri.cantidad,
      unidad: ri.unidad,
      ingrediente: ri.ingrediente || null,
    });
    ingredientesPorReceta.set(ri.receta_id, lista);
  });

  // 8. Combinar platos con sus recetas + análisis nutricional dinámico
  const todosLosPlatos = (platos || []).map(plato => {
    const receta = recetasMap.get(plato.id) || null;
    const ingredientes = receta ? ingredientesPorReceta.get(receta.id) || [] : [];
    const analisis = receta ? analizarPlato(ingredientes, receta.porciones || 1) : null;
    const ingredientesParaVista = ingredientes.length > 0
      ? ingredientes.map((ri) => ({
          nombre: (ri.ingrediente as any)?.nombre || 'Ingrediente',
          cantidad: ri.cantidad,
          unidad: ri.unidad,
        }))
      : (Array.isArray(receta?.ingredientes) ? receta.ingredientes : []);

    // Alérgenos: combinar los cargados en el plato con los derivados de los
    // ingredientes de la receta (crítico para salud: nunca omitir uno presente).
    const alergenosSet = new Set<string>(
      Array.isArray(plato.alergenos) ? plato.alergenos.filter(Boolean) : []
    );
    ingredientes.forEach((ri) => {
      const lista = (ri.ingrediente as any)?.alergenos;
      if (Array.isArray(lista)) lista.forEach((a: string) => a && alergenosSet.add(a));
    });
    const alergenos = Array.from(alergenosSet);

    // Tags: respetar los curados del plato; si están vacíos, derivarlos de las
    // categorías destacables de los ingredientes.
    let tags = Array.isArray(plato.tags) ? plato.tags.filter(Boolean) : [];
    if (tags.length === 0) {
      const tagsSet = new Set<string>();
      ingredientes.forEach((ri) => {
        const tag = MAPA_CATEGORIA_TAG[(ri.ingrediente as any)?.categoria];
        if (tag) tagsSet.add(tag);
      });
      tags = Array.from(tagsSet);
    }

    return {
      ...plato,
      dias_semana: diasPorPlato.get(plato.id) || diasSemanaDesdeLegado(plato.dia_semana_id, plato.disponible_todos_dias),
      alergenos,
      tags,
      receta: receta
        ? {
            ...receta,
            ingredientes: ingredientesParaVista,
          }
        : null,
      analisis,
    };
  });

  // 9. Preparar categorías con platos
  const categoriasConPlatos = (categorias || []).map((cat) => ({
    id: cat.id,
    nombre: cat.nombre,
    icono: cat.icono || '🍽️',
    platos: todosLosPlatos.filter((p) => p.categoria_id === cat.id),
  }));

  return (
    <MenuVisual
      restaurante={restaurante}
      diaInfo={diaInfo}
      categorias={categoriasConPlatos}
      todosLosPlatos={todosLosPlatos}
    />
  );
}

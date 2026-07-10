import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import MenuVisual from './MenuVisual';
import { analizarPlato, type RecetaIngredienteEntrada } from '@/lib/analisis-plato';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function MenuPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();

  // 1. Obtener el restaurante
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', params.slug)
    .single();

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

  // 6. Obtener TODAS las recetas
  const { data: recetas } = await supabase
    .from('recetas')
    .select('*');

  // 7. Crear un mapa de recetas por plato_id
  const recetasMap = new Map();
  if (recetas) {
    recetas.forEach(receta => {
      recetasMap.set(receta.plato_id, receta);
    });
  }

  // 7b. Obtener los ingredientes con datos nutricionales de todas las recetas
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
        temperamento, propiedades_hildegardianas
      )
    `)
    .in('receta_id', recetaIds.length ? recetaIds : ['00000000-0000-0000-0000-000000000000']);

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
    return {
      ...plato,
      receta,
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

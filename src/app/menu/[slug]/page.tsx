import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import MenuVisual from './MenuVisual';

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

  // 8. Combinar platos con sus recetas
  const todosLosPlatos = (platos || []).map(plato => ({
    ...plato,
    receta: recetasMap.get(plato.id) || null,
  }));

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

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import CalendarioPedidos from './CalendarioPedidos';

export default async function NuevoPedidoPage() {
  const supabase = createServerSupabaseClient();

  // 1. Obtener restaurante
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', 'resto-presta-bingen-all')
    .single();

  if (!restaurante) {
    redirect('/');
  }

  // 2. Obtener todos los platos disponibles
  const { data: platos } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', restaurante.id)
    .eq('disponible', true)
    .order('categoria_id')
    .order('orden');

  // 3. Obtener categorías
  const { data: categorias } = await supabase
    .from('categorias_plato')
    .select('*')
    .order('orden');

  return (
    <CalendarioPedidos
      restaurante={restaurante}
      platos={platos || []}
      categorias={categorias || []}
    />
  );
}

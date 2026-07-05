import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import CalendarioPedidos from './CalendarioPedidos';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function GrupoPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();

  // 1. Obtener el grupo
  const { data: grupo, error: errorGrupo } = await supabase
    .from('grupos_pedido')
    .select(`
      *,
      miembros:grupo_miembros(
        *,
        cliente:clientes(id, nombre, email)
      )
    `)
    .eq('id', params.id)
    .single();

  if (errorGrupo || !grupo) {
    notFound();
  }

  // 2. Obtener items del pedido
  const { data: items } = await supabase
    .from('grupo_items')
    .select(`
      *,
      plato:platos(id, nombre, descripcion, precio, categoria_id, dia_semana_id, disponible_todos_dias, alergenos, tags)
    `)
    .eq('grupo_id', params.id);

  // 3. Obtener todos los platos del restaurante
  const { data: platos } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', grupo.restaurante_id)
    .eq('disponible', true);

  // 4. Obtener cliente actual del localStorage (simulación)
  // En producción vendría de autenticación
  const clienteActualId = grupo.creado_por; // Por defecto, el creador

  return (
    <CalendarioPedidos
      grupoId={grupo.id}
      fechaInicio={grupo.fecha_inicio}
      fechaFin={grupo.fecha_fin}
      miembros={grupo.miembros || []}
      items={items || []}
      platos={platos || []}
      clienteActualId={clienteActualId}
    />
  );
}

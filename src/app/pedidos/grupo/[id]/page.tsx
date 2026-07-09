import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
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

  // 3. Obtener todos los platos del restaurante CON recetas e ingredientes
  const { data: platos } = await supabase
    .from('platos')
    .select(`
      *,
      receta:recetas(
        id, pasos, tiempo_min, porciones, dificultad, notas_hildegardianas, interpretacion_hildegardiana,
        ingredientes:receta_ingredientes(
          cantidad, unidad,
          ingrediente:ingredientes(
            id, nombre, temperamento, es_veneno_hildegardiano,
            es_base_alegria, nivel_subtilitat, requiere_coccion,
            calorias, proteinas_g, carbohidratos_g, grasas_g, grasas_saturadas_g, fibra_g, azucar_g,
            sodio_mg, calcio_mg, hierro_mg, magnesio_mg, potasio_mg, zinc_mg, fosforo_mg,
            vitamina_a_mcg, vitamina_c_mg, vitamina_d_mcg, vitamina_e_mg, vitamina_k_mcg,
            vitamina_b1_mg, vitamina_b2_mg, vitamina_b3_mg, vitamina_b5_mg, vitamina_b6_mg, vitamina_b9_mcg, vitamina_b12_mcg
          )
        )
      )
    `)
    .eq('restaurante_id', grupo.restaurante_id)
    .eq('disponible', true);

  // 4. Cliente actual
  const clienteActualId = grupo.creado_por;

  return (
    <CalendarioPedidos
      grupoId={grupo.id}
      palabraSecreta={grupo.palabra_secreta}
      fechaInicio={grupo.fecha_inicio}
      fechaFin={grupo.fecha_fin}
      miembros={grupo.miembros || []}
      items={items || []}
      platos={platos || []}
      clienteActualId={clienteActualId}
    />
  );
}

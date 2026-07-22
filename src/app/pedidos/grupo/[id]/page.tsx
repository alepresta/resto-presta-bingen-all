import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CalendarioPedidos from './CalendarioPedidos';
import { diasSemanaDesdeLegado } from '@/lib/plato-dias';

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

  // 3. Obtener todos los platos del restaurante CON recetas e ingredientes.
  //    Si el grupo no tiene restaurante_id (grupos viejos), se usa el
  //    restaurante por defecto para no quedarnos sin platos.
  let restauranteId = grupo.restaurante_id;
  if (!restauranteId) {
    const { data: restaurante } = await supabase
      .from('restaurantes')
      .select('id')
      .limit(1)
      .single();
    restauranteId = restaurante?.id ?? null;
  }

  let platosQuery = supabase
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
    .eq('disponible', true);

  if (restauranteId) {
    platosQuery = platosQuery.eq('restaurante_id', restauranteId);
  }

  const { data: platos } = await platosQuery;

  // 3b. Días asignados a cada plato (tabla plato_dias). Se usa para mostrar en
  //     cada fecha solo los platos realmente asignados a ese día de la semana.
  const platoIdsCatalogo = (platos || []).map((p: any) => p.id);
  const { data: platosDiasData } = await supabase
    .from('plato_dias')
    .select('plato_id, dia_semana_id')
    .in('plato_id', platoIdsCatalogo.length ? platoIdsCatalogo : ['00000000-0000-0000-0000-000000000000']);

  const diasPorPlato = new Map<string, number[]>();
  (platosDiasData || []).forEach((row: any) => {
    const lista = diasPorPlato.get(row.plato_id) || [];
    lista.push(row.dia_semana_id);
    diasPorPlato.set(row.plato_id, lista);
  });

  const platosConDias = (platos || []).map((p: any) => ({
    ...p,
    dias_semana:
      diasPorPlato.get(p.id) || diasSemanaDesdeLegado(p.dia_semana_id, p.disponible_todos_dias),
  }));

  // 4. Cliente actual: usuario autenticado (sesión). Si no hay, cae al creador.
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  let clienteActualId = grupo.creado_por;
  let clienteNombre = '';
  let clienteEmail = '';
  if (user) {
    clienteActualId = user.id;
    clienteEmail = user.email ?? '';
    const { data: perfil } = await authClient
      .from('profiles')
      .select('nombre, apellido')
      .eq('id', user.id)
      .single();
    clienteNombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || user.email || '';
  }

  return (
    <CalendarioPedidos
      grupoId={grupo.id}
      palabraSecreta={grupo.palabra_secreta}
      fechaInicio={grupo.fecha_inicio}
      fechaFin={grupo.fecha_fin}
      miembros={grupo.miembros || []}
      items={items || []}
      platos={platosConDias}
      clienteActualId={clienteActualId}
      clienteNombre={clienteNombre}
      clienteEmail={clienteEmail}
    />
  );
}

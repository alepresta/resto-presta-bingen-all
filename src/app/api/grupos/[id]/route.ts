import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { diasSemanaDesdeLegado } from '@/lib/plato-dias';

// GET /api/grupos/[id] - obtener estado actual del grupo (miembros/items/platos)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: grupo, error } = await supabase
      .from('grupos_pedido')
      .select(`
        id,
        estado,
        restaurante_id,
        fecha_inicio,
        fecha_fin,
        palabra_secreta,
        miembros:grupo_miembros(
          id,
          cliente_id,
          rol,
          confirmado_general,
          cliente:clientes(id, nombre, email)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !grupo) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    const { data: items } = await supabase
      .from('grupo_items')
      .select('*')
      .eq('grupo_id', params.id);

    // Catálogo de platos actualizado para autocorregir clientes móviles con estado viejo.
    let restauranteId = (grupo as any)?.restaurante_id ?? null;
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

    return NextResponse.json(
      {
        grupo,
        miembros: grupo.miembros || [],
        items: items || [],
        platos: platosConDias,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/grupos/[id] - acciones del cliente sobre el grupo (confirmar acuerdo)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { accion, cliente_id, fecha } = body;

    const recomputarEstadoGrupo = async () => {
      const { data: miembrosActivos } = await supabase
        .from('grupo_miembros')
        .select('cliente_id')
        .eq('grupo_id', params.id);

      const idsMiembros = new Set((miembrosActivos || []).map((m: any) => m.cliente_id));

      const { data: itemsGrupo } = await supabase
        .from('grupo_items')
        .select('id, seleccionado_por, votos')
        .eq('grupo_id', params.id);

      const totalMiembros = idsMiembros.size;
      const hayItems = (itemsGrupo || []).length > 0;

      const todosAcordaron =
        hayItems &&
        totalMiembros > 0 &&
        (itemsGrupo || []).every((it: any) => {
          const acuerdo = new Set<string>();
          if (it.seleccionado_por && idsMiembros.has(it.seleccionado_por)) acuerdo.add(it.seleccionado_por);
          const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
          votos.forEach((v) => {
            if (idsMiembros.has(v)) acuerdo.add(v);
          });
          return acuerdo.size === totalMiembros;
        });

      await supabase
        .from('grupos_pedido')
        .update({ estado: todosAcordaron ? 'confirmado' : 'armando' })
        .eq('id', params.id);

      return { todosAcordaron, totalMiembros };
    };

    if (accion === 'confirmar_dia') {
      if (!cliente_id || !fecha) {
        return NextResponse.json({ error: 'Faltan cliente o fecha' }, { status: 400 });
      }

      const { data: itemsDia } = await supabase
        .from('grupo_items')
        .select('id, votos')
        .eq('grupo_id', params.id)
        .eq('fecha', fecha);

      for (const it of itemsDia || []) {
        const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
        if (!votos.includes(cliente_id)) {
          await supabase
            .from('grupo_items')
            .update({ votos: [...votos, cliente_id] })
            .eq('id', it.id);
        }
      }

      const { todosAcordaron } = await recomputarEstadoGrupo();
      return NextResponse.json({
        mensaje: todosAcordaron
          ? '🎉 ¡Todos acordaron todos los días cargados del plan!'
          : '✅ Confirmaste este día. Quedaste de acuerdo con todos sus platos.',
      });
    }

    if (accion === 'desconfirmar_dia') {
      if (!cliente_id || !fecha) {
        return NextResponse.json({ error: 'Faltan cliente o fecha' }, { status: 400 });
      }

      const { data: itemsDia } = await supabase
        .from('grupo_items')
        .select('id, votos')
        .eq('grupo_id', params.id)
        .eq('fecha', fecha);

      for (const it of itemsDia || []) {
        const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
        if (votos.includes(cliente_id)) {
          await supabase
            .from('grupo_items')
            .update({ votos: votos.filter((v) => v !== cliente_id) })
            .eq('id', it.id);
        }
      }

      await recomputarEstadoGrupo();
      return NextResponse.json({ mensaje: '✏️ Reabriste ese día para poder volver a cambiar platos.' });
    }

    if (accion === 'limpiar_dia') {
      if (!cliente_id || !fecha) {
        return NextResponse.json({ error: 'Faltan cliente o fecha' }, { status: 400 });
      }

      // Solo un miembro del grupo puede vaciar el día.
      const { data: miembro } = await supabase
        .from('grupo_miembros')
        .select('id')
        .eq('grupo_id', params.id)
        .eq('cliente_id', cliente_id)
        .maybeSingle();

      if (!miembro) {
        return NextResponse.json({ error: 'No pertenecés a este grupo.' }, { status: 403 });
      }

      const { error: errorDelete } = await supabase
        .from('grupo_items')
        .delete()
        .eq('grupo_id', params.id)
        .eq('fecha', fecha);

      if (errorDelete) {
        return NextResponse.json({ error: errorDelete.message }, { status: 500 });
      }

      await recomputarEstadoGrupo();
      return NextResponse.json({ mensaje: '🧹 Se limpiaron todos los platos de ese día.' });
    }

    if (accion === 'confirmar') {
      if (!cliente_id) {
        return NextResponse.json(
          { error: 'Falta el cliente' },
          { status: 400 }
        );
      }

      // Marcar al miembro como confirmado
      const { error: errorMiembro } = await supabase
        .from('grupo_miembros')
        .update({ confirmado_general: true })
        .eq('grupo_id', params.id)
        .eq('cliente_id', cliente_id);

      if (errorMiembro) {
        return NextResponse.json(
          { error: errorMiembro.message },
          { status: 500 }
        );
      }

      // Al confirmar el menú, el cliente queda "de acuerdo" con TODOS los platos propuestos.
      const { data: itemsGrupo } = await supabase
        .from('grupo_items')
        .select('id, votos')
        .eq('grupo_id', params.id);

      for (const it of itemsGrupo || []) {
        const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
        if (!votos.includes(cliente_id)) {
          await supabase
            .from('grupo_items')
            .update({ votos: [...votos, cliente_id] })
            .eq('id', it.id);
        }
      }

      // Verificar si todos confirmaron
      const { data: miembros } = await supabase
        .from('grupo_miembros')
        .select('confirmado_general')
        .eq('grupo_id', params.id);

      const total = miembros?.length || 0;
      const confirmados = miembros?.filter((m) => m.confirmado_general).length || 0;

      let mensaje = '✅ Confirmaste tu acuerdo con el menú';

      if (total > 0 && confirmados === total) {
        await supabase
          .from('grupos_pedido')
          .update({ estado: 'confirmado' })
          .eq('id', params.id);
        mensaje = '🎉 ¡Todos confirmaron! El pedido fue enviado.';
      }

      return NextResponse.json({ mensaje, confirmados, total });
    }

    if (accion === 'desconfirmar') {
      if (!cliente_id) {
        return NextResponse.json(
          { error: 'Falta el cliente' },
          { status: 400 }
        );
      }

      // Quitar la confirmación del miembro para que pueda volver a editar su menú
      const { error: errorMiembro } = await supabase
        .from('grupo_miembros')
        .update({ confirmado_general: false })
        .eq('grupo_id', params.id)
        .eq('cliente_id', cliente_id);

      if (errorMiembro) {
        return NextResponse.json(
          { error: errorMiembro.message },
          { status: 500 }
        );
      }

      // Al reactivar, se retira su "de acuerdo" masivo de los platos
      const { data: itemsDes } = await supabase
        .from('grupo_items')
        .select('id, votos')
        .eq('grupo_id', params.id);

      for (const it of itemsDes || []) {
        const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
        if (votos.includes(cliente_id)) {
          await supabase
            .from('grupo_items')
            .update({ votos: votos.filter((v) => v !== cliente_id) })
            .eq('id', it.id);
        }
      }

      // Si el grupo estaba confirmado, vuelve a "armando"
      await supabase
        .from('grupos_pedido')
        .update({ estado: 'armando' })
        .eq('id', params.id);

      return NextResponse.json({ mensaje: '✏️ Reactivaste tu menú, ya podés volver a cambiarlo' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

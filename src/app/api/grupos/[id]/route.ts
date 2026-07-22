import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

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

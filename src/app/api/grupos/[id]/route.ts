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
    const { accion, cliente_id } = body;

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

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

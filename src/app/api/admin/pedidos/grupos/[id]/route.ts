import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Obtener detalle de un grupo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data: grupo, error } = await supabase
    .from('grupos_pedido')
    .select(`
      *,
      miembros:grupo_miembros(
        *,
        cliente:clientes(id, nombre, email)
      ),
      items:grupo_items(
        *,
        plato:platos(id, nombre, categoria_id, precio)
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !grupo) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ grupo });
}

// PUT: Confirmar, desconfirmar o cancelar grupo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { accion } = body;

  try {
    // Edición de datos del pedido (fechas y palabra secreta)
    if (accion === 'editar') {
      const { fecha_inicio, fecha_fin, palabra_secreta } = body;

      if (!fecha_inicio || !fecha_fin || !palabra_secreta) {
        return NextResponse.json(
          { error: 'Faltan campos obligatorios' },
          { status: 400 }
        );
      }

      if (new Date(fecha_inicio) > new Date(fecha_fin)) {
        return NextResponse.json(
          { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
          { status: 400 }
        );
      }

      // Verificar que la palabra secreta no esté en uso por otro pedido
      const { data: existente } = await supabase
        .from('grupos_pedido')
        .select('id')
        .eq('palabra_secreta', palabra_secreta)
        .neq('id', params.id)
        .maybeSingle();

      if (existente) {
        return NextResponse.json(
          { error: 'Ya existe otro pedido con esa palabra secreta' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('grupos_pedido')
        .update({ fecha_inicio, fecha_fin, palabra_secreta })
        .eq('id', params.id);

      if (error) throw error;

      return NextResponse.json({ mensaje: 'Pedido actualizado' });
    }

    let nuevoEstado = '';

    if (accion === 'confirmar') {
      nuevoEstado = 'confirmado';
    } else if (accion === 'desconfirmar') {
      nuevoEstado = 'armando';
    } else if (accion === 'cancelar') {
      nuevoEstado = 'cancelado';
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const { error } = await supabase
      .from('grupos_pedido')
      .update({ estado: nuevoEstado })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ 
      mensaje: `Grupo ${accion === 'desconfirmar' ? 'desconfirmado' : accion === 'cancelar' ? 'cancelado' : 'confirmado'}`,
      estado: nuevoEstado
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar grupo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  try {
    // Primero eliminar los items
    await supabase
      .from('grupo_items')
      .delete()
      .eq('grupo_id', params.id);

    // Luego los miembros
    await supabase
      .from('grupo_miembros')
      .delete()
      .eq('grupo_id', params.id);

    // Finalmente el grupo
    const { error } = await supabase
      .from('grupos_pedido')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ mensaje: '🗑️ Grupo eliminado' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

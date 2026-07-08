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

// PUT: Confirmar o cancelar grupo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { accion } = body;

  try {
    if (accion === 'confirmar') {
      const { error } = await supabase
        .from('grupos_pedido')
        .update({ estado: 'confirmado' })
        .eq('id', params.id);

      if (error) throw error;

      return NextResponse.json({ mensaje: '✅ Grupo confirmado' });
    }

    if (accion === 'cancelar') {
      const { error } = await supabase
        .from('grupos_pedido')
        .update({ estado: 'cancelado' })
        .eq('id', params.id);

      if (error) throw error;

      return NextResponse.json({ mensaje: '❌ Grupo cancelado' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
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

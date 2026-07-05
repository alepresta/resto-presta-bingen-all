import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// POST /api/grupos/[id]/items - Seleccionar plato
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    
    const { 
      cliente_id, 
      fecha, 
      tipo_comida, 
      plato_id, 
      cantidad = 1 
    } = body;
    
    // Validaciones
    if (!cliente_id || !fecha || !tipo_comida || !plato_id) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Obtener precio del plato
    const { data: plato } = await supabase
      .from('platos')
      .select('precio')
      .eq('id', plato_id)
      .single();
    
    if (!plato) {
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }
    
    // Upsert: insertar o actualizar si ya existe
    const { data: item, error } = await supabase
      .from('grupo_items')
      .upsert({
        grupo_id: params.id,
        fecha,
        tipo_comida,
        plato_id,
        cantidad,
        seleccionado_por: cliente_id,
        modificado_por: cliente_id,
        votos: [cliente_id]
      }, {
        onConflict: 'grupo_id,fecha,tipo_comida'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      item,
      mensaje: 'Plato seleccionado exitosamente' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// DELETE /api/grupos/[id]/items - Eliminar selección
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');
    
    if (!item_id) {
      return NextResponse.json({ error: 'Falta item_id' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('grupo_items')
      .delete()
      .eq('id', item_id)
      .eq('grupo_id', params.id);
    
    if (error) throw error;
    
    return NextResponse.json({ mensaje: 'Selección eliminada' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

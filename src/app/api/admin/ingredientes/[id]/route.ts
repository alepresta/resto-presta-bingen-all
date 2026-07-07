import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('ingredientes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Ingrediente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ingrediente: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('ingredientes')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ingrediente: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  // Verificar si se usa en recetas
  const { data: usos } = await supabase
    .from('receta_ingredientes')
    .select('id')
    .eq('ingrediente_id', params.id)
    .limit(1);

  if (usos && usos.length > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: está siendo usado en recetas' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('ingredientes')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

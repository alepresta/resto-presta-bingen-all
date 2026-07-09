import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Obtener receta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  
  const { data: receta, error } = await supabase
    .from('recetas')
    .select(`
      *,
      platos:plato_id (id, nombre, categoria_id)
    `)
    .eq('id', params.id)
    .single();

  if (error || !receta) {
    return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ receta });
}

// PUT: Actualizar receta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { tiempo_min, porciones, dificultad, pasos, ingredientes, notas_hildegardianas, interpretacion_hildegardiana } = body;

  const { data: receta, error } = await supabase
    .from('recetas')
    .update({
      tiempo_min,
      porciones,
      dificultad,
      pasos,
      ingredientes,
      notas_hildegardianas,
      interpretacion_hildegardiana,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ receta });
}

// DELETE: Eliminar receta
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from('recetas')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// POST: Para manejar el formulario de eliminación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const formData = await request.formData();
  const method = formData.get('_method');

  if (method === 'DELETE') {
    return DELETE(request, { params });
  }

  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 });
}

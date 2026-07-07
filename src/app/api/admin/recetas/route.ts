import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Listar todas las recetas
export async function GET() {
  const supabase = createServerSupabaseClient();
  
  const { data: recetas, error } = await supabase
    .from('recetas')
    .select(`
      *,
      plato:platos(id, nombre, categoria_id)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recetas });
}

// POST: Crear nueva receta
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { plato_id, tiempo_min, porciones, dificultad, pasos, ingredientes, notas_hildegardianas } = body;

  if (!plato_id) {
    return NextResponse.json({ error: 'plato_id es obligatorio' }, { status: 400 });
  }

  const { data: receta, error } = await supabase
    .from('recetas')
    .insert({
      plato_id,
      tiempo_min,
      porciones,
      dificultad,
      pasos,
      ingredientes,
      notas_hildegardianas,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ receta });
}

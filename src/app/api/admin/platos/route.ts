import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Listar todos los platos (para el select)
export async function GET() {
  const supabase = createServerSupabaseClient();
  
  const { data: platos, error } = await supabase
    .from('platos')
    .select('id, nombre, categoria_id')
    .eq('disponible', true)
    .order('nombre');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ platos });
}

// PATCH: Publicar / despublicar varios platos a la vez
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'ids debe ser un arreglo de strings no vacío' }, { status: 400 });
  }

  if (!('disponible' in body)) {
    return NextResponse.json({ error: 'Falta el campo disponible' }, { status: 400 });
  }
  const disponible = Boolean(body.disponible);

  const { data, error } = await supabase
    .from('platos')
    .update({ disponible })
    .in('id', ids)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ actualizados: data?.length ?? 0 });
}

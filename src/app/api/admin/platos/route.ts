import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

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

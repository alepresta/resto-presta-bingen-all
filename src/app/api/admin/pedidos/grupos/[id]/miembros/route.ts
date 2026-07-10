import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// POST: Agregar miembro
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { cliente_id } = body;

  try {
    // Agregar miembro (sin límite de cantidad)
    const { data: miembro, error } = await supabase
      .from('grupo_miembros')
      .insert({
        grupo_id: params.id,
        cliente_id,
        rol: 'miembro',
        confirmado_general: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ miembro });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    // Verificar que el grupo no tenga 4 miembros
    const { data: miembros } = await supabase
      .from('grupo_miembros')
      .select('id')
      .eq('grupo_id', params.id);

    if (miembros && miembros.length >= 4) {
      return NextResponse.json(
        { error: 'El grupo ya tiene 4 miembros' },
        { status: 400 }
      );
    }

    // Agregar miembro
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

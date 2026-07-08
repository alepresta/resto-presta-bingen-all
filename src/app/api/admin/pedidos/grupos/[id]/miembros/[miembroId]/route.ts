import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// DELETE: Eliminar miembro
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; miembroId: string } }
) {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('grupo_miembros')
      .delete()
      .eq('id', params.miembroId)
      .eq('grupo_id', params.id);

    if (error) throw error;

    return NextResponse.json({ mensaje: 'Miembro eliminado' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

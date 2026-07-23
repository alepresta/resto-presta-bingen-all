import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUsuarioConRol } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAdmin() {
  const usuario = await getUsuarioConRol();
  if (!usuario || usuario.rol !== 'admin') return null;
  return usuario;
}

// DELETE: Eliminar miembro
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; miembroId: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const supabase = createServerSupabaseClient();

  try {
    const { data: miembro } = await supabase
      .from('grupo_miembros')
      .select('id')
      .eq('id', params.miembroId)
      .eq('grupo_id', params.id)
      .maybeSingle();

    if (!miembro) {
      return NextResponse.json({ error: 'Miembro no encontrado en este grupo' }, { status: 404 });
    }

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

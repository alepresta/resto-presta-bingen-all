import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUsuarioConRol } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAdmin() {
  const usuario = await getUsuarioConRol();
  if (!usuario || usuario.rol !== 'admin') return null;
  return usuario;
}

// POST: Agregar miembro
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { cliente_id } = body;

  try {
    if (!cliente_id) {
      return NextResponse.json({ error: 'Falta cliente_id' }, { status: 400 });
    }

    const { data: grupo } = await supabase
      .from('grupos_pedido')
      .select('id')
      .eq('id', params.id)
      .maybeSingle();

    if (!grupo) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    const { data: miembroExistente } = await supabase
      .from('grupo_miembros')
      .select('id')
      .eq('grupo_id', params.id)
      .eq('cliente_id', cliente_id)
      .maybeSingle();

    if (miembroExistente) {
      return NextResponse.json({ error: 'Ese cliente ya pertenece al grupo' }, { status: 400 });
    }

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

    if (error) {
      if (error.message?.includes('4 miembros')) {
        return NextResponse.json({ error: 'El grupo alcanzó el límite de miembros configurado en la base de datos' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ miembro });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

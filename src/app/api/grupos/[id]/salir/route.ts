import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/grupos/[id]/salir - el usuario autenticado abandona el grupo
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Identidad segura: usuario autenticado
    const authClient = createSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Quitar la membresía
    const { error: errorMiembro } = await supabase
      .from('grupo_miembros')
      .delete()
      .eq('grupo_id', params.id)
      .eq('cliente_id', user.id);

    if (errorMiembro) {
      return NextResponse.json({ error: errorMiembro.message }, { status: 500 });
    }

    // Quitar sus votos de los platos del grupo (para que el conteo de acuerdo quede correcto)
    const { data: items } = await supabase
      .from('grupo_items')
      .select('id, votos')
      .eq('grupo_id', params.id);

    for (const it of items || []) {
      const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
      if (votos.includes(user.id)) {
        await supabase
          .from('grupo_items')
          .update({ votos: votos.filter((v) => v !== user.id) })
          .eq('id', it.id);
      }
    }

    return NextResponse.json({ ok: true, mensaje: 'Saliste del grupo' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/grupos/mis?cliente_id=...&cliente_id_local=...
// Devuelve los grupos a los que pertenece el cliente (por IDs).
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('cliente_id');
    const clienteIdLocal = searchParams.get('cliente_id_local');

    if (!clienteId && !clienteIdLocal) {
      return NextResponse.json({ grupos: [] });
    }

    // Reunir los ids de cliente válidos (auth + local, cuando difieran).
    const clienteIds = new Set<string>();
    if (clienteId) clienteIds.add(clienteId);
    if (clienteIdLocal) clienteIds.add(clienteIdLocal);

    if (clienteIds.size === 0) {
      return NextResponse.json({ grupos: [] });
    }

    const { data: miembros } = await supabase
      .from('grupo_miembros')
      .select(`
        grupo_id,
        confirmado_general,
        grupo:grupos_pedido(id, palabra_secreta, fecha_inicio, fecha_fin, estado)
      `)
      .in('cliente_id', Array.from(clienteIds));

    // Deduplicar por grupo_id y quedarse con los grupos existentes (no cancelados)
    const porGrupo = new Map<string, any>();
    (miembros || []).forEach((m: any) => {
      const g = m.grupo;
      if (!g || g.estado === 'cancelado') return;
      if (!porGrupo.has(g.id)) {
        porGrupo.set(g.id, {
          id: g.id,
          palabra_secreta: g.palabra_secreta,
          fecha_inicio: g.fecha_inicio,
          fecha_fin: g.fecha_fin,
          estado: g.estado,
          confirmado: !!m.confirmado_general,
        });
      }
    });

    const grupos = Array.from(porGrupo.values()).sort((a, b) =>
      (b.fecha_inicio || '').localeCompare(a.fecha_inicio || '')
    );

    return NextResponse.json({ grupos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

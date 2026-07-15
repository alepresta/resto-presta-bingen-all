import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { obtenerInformeDualPorReceta } from '@/lib/informe-dual-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/menu/receta/[id]/informe?porciones=N
 * Endpoint PÚBLICO del menú: devuelve el Informe Dual de una receta.
 * No requiere sesión (los datos de la receta ya son públicos en el menú).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const porciones = parseInt(searchParams.get('porciones') || '', 10) || null;

  const { informe, error, status } = await obtenerInformeDualPorReceta(
    supabase,
    params.id,
    porciones
  );

  if (!informe) {
    return NextResponse.json(
      { error: error || 'No se pudo generar el informe' },
      { status: status || 500 }
    );
  }

  return NextResponse.json({ informe });
}

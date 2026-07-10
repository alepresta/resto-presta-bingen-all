import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH: Actualizar un plato (imagen, precio, disponibilidad, día de la semana)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const cambios: Record<string, unknown> = {};

  if ('imagen' in body) {
    const imagen = body.imagen;
    if (imagen !== null && typeof imagen !== 'string') {
      return NextResponse.json({ error: 'imagen debe ser texto o null' }, { status: 400 });
    }
    cambios.imagen = imagen ? String(imagen).trim() : null;
  }

  if ('precio' in body) {
    const raw = body.precio;
    if (raw === null || raw === '' || raw === undefined) {
      // "Sin precio": la columna es NOT NULL, usamos 0 como centinela
      cambios.precio = 0;
    } else {
      const precio = Number(raw);
      if (!Number.isFinite(precio) || precio < 0) {
        return NextResponse.json({ error: 'precio inválido' }, { status: 400 });
      }
      cambios.precio = precio;
    }
  }

  if ('disponible' in body) {
    cambios.disponible = Boolean(body.disponible);
  }

  if ('dia_semana_id' in body) {
    const dia = body.dia_semana_id;
    if (dia === null || dia === '' || dia === undefined) {
      cambios.dia_semana_id = null;
      cambios.disponible_todos_dias = true;
    } else {
      const diaNum = Number(dia);
      if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 7) {
        return NextResponse.json({ error: 'dia_semana_id debe ser 1-7 o null' }, { status: 400 });
      }
      cambios.dia_semana_id = diaNum;
      cambios.disponible_todos_dias = false;
    }
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('platos')
    .update(cambios)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plato: data });
}

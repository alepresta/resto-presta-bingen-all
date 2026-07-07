import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Obtener ingredientes de una receta
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('receta_ingredientes')
    .select(`
      id,
      cantidad,
      unidad,
      notas,
      orden,
      ingrediente:ingredientes(id, nombre, categoria, unidad_base)
    `)
    .eq('receta_id', params.id)
    .order('orden');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ingredientes: data || [] });
}

// POST: Reemplazar todos los ingredientes de una receta
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { ingredientes } = body; // Array de {ingrediente_id, cantidad, unidad, notas?}

  try {
    // 1. Eliminar ingredientes existentes
    await supabase
      .from('receta_ingredientes')
      .delete()
      .eq('receta_id', params.id);

    // 2. Insertar nuevos
    if (ingredientes && ingredientes.length > 0) {
      const nuevosIngredientes = ingredientes.map((ing: any, index: number) => ({
        receta_id: params.id,
        ingrediente_id: ing.ingrediente_id,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        notas: ing.notas || null,
        orden: index,
      }));

      const { error } = await supabase
        .from('receta_ingredientes')
        .insert(nuevosIngredientes);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

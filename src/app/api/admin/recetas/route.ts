import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { actualizarDatosPlato, autorizarRecetas, reemplazarIngredientesReceta } from './_shared';

// GET: Listar todas las recetas
export async function GET() {
  const autorizacion = await autorizarRecetas('GET');
  if (autorizacion) return autorizacion;

  const supabase = createServerSupabaseClient();
  
  const { data: recetas, error } = await supabase
    .from('recetas')
    .select(`
      *,
      plato:platos(id, nombre, categoria_id)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recetas });
}

// POST: Crear nueva receta
export async function POST(request: NextRequest) {
  const autorizacion = await autorizarRecetas(request.method);
  if (autorizacion) return autorizacion;

  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const {
    plato_id,
    tiempo_min,
    porciones,
    dificultad,
    pasos,
    ingredientes,
    notas_hildegardianas,
    interpretacion_hildegardiana,
    dia_semana_id,
    plato_nombre,
  } = body;

  if (!plato_id) {
    return NextResponse.json({ error: 'plato_id es obligatorio' }, { status: 400 });
  }

  let recetaId: string | null = null;

  try {
    const { data: receta, error } = await supabase
      .from('recetas')
      .insert({
        plato_id,
        tiempo_min,
        porciones,
        dificultad,
        pasos,
        ingredientes,
        notas_hildegardianas,
        interpretacion_hildegardiana,
      })
      .select()
      .single();

    if (error || !receta) {
      return NextResponse.json({ error: error?.message || 'No se pudo crear la receta' }, { status: 500 });
    }

    recetaId = receta.id;

    await reemplazarIngredientesReceta(supabase, receta.id, ingredientes);
    await actualizarDatosPlato(supabase, plato_id, plato_nombre, dia_semana_id);

    return NextResponse.json({ receta });
  } catch (error: any) {
    if (recetaId) {
      await supabase.from('recetas').delete().eq('id', recetaId);
    }

    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ese plato ya tiene una receta asociada' }, { status: 409 });
    }

    return NextResponse.json({ error: error.message || 'Error al guardar receta' }, { status: 500 });
  }
}

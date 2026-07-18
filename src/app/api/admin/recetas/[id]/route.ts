import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import {
  actualizarDatosPlato,
  actualizarEstadoReceta,
  autorizarRecetas,
  normalizarDiasSemanaPlato,
  normalizarEstadoReceta,
  reemplazarIngredientesReceta,
} from '../_shared';

// GET: Obtener receta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const autorizacion = await autorizarRecetas(request.method);
  if (autorizacion) return autorizacion;

  const supabase = createServerSupabaseClient();
  
  const { data: receta, error } = await supabase
    .from('recetas')
    .select(`
      *,
      platos:plato_id (id, nombre, categoria_id)
    `)
    .eq('id', params.id)
    .single();

  if (error || !receta) {
    return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ receta });
}

// PUT: Actualizar receta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const autorizacion = await autorizarRecetas(request.method);
  if (autorizacion) return autorizacion;

  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const estadoNormalizado = normalizarEstadoReceta(body.estado);
  const diasSemanaNormalizados = normalizarDiasSemanaPlato(body.dias_semana ?? body.dia_semana_id);

  const {
    plato_id,
    tiempo_min,
    porciones,
    dificultad,
    pasos,
    ingredientes,
    notas_hildegardianas,
    interpretacion_hildegardiana,
    plato_nombre,
    plato_descripcion,
  } = body;

  if (!plato_id) {
    return NextResponse.json({ error: 'plato_id es obligatorio' }, { status: 400 });
  }

  try {
    const { data: recetaActual, error: errorRecetaActual } = await supabase
      .from('recetas')
      .select('estado')
      .eq('id', params.id)
      .single();

    if (errorRecetaActual || !recetaActual) {
      return NextResponse.json({ error: errorRecetaActual?.message || 'Receta no encontrada' }, { status: 404 });
    }

    const { data: receta, error } = await supabase
      .from('recetas')
      .update({
        plato_id,
        tiempo_min,
        porciones,
        dificultad,
        pasos,
        ingredientes,
        notas_hildegardianas,
        interpretacion_hildegardiana,
      })
      .eq('id', params.id)
      .select('id, estado')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (estadoNormalizado !== recetaActual.estado) {
      await actualizarEstadoReceta(supabase, params.id, estadoNormalizado);
    }

    await reemplazarIngredientesReceta(supabase, params.id, ingredientes);
  await actualizarDatosPlato(supabase, plato_id, plato_nombre, diasSemanaNormalizados, plato_descripcion);

    return NextResponse.json({ receta });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ese plato ya tiene otra receta asociada' }, { status: 409 });
    }

    return NextResponse.json({ error: error.message || 'Error al actualizar receta' }, { status: 500 });
  }
}

// DELETE: Eliminar receta
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const autorizacion = await autorizarRecetas(request.method);
  if (autorizacion) return autorizacion;

  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from('recetas')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// POST: Para manejar el formulario de eliminación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const autorizacion = await autorizarRecetas(request.method);
  if (autorizacion) return autorizacion;

  const formData = await request.formData();
  const method = formData.get('_method');

  if (method === 'DELETE') {
    return DELETE(request, { params });
  }

  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 });
}

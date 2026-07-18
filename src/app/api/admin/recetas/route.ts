import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import {
  actualizarDatosPlato,
  autorizarRecetas,
  normalizarDiaSemana,
  normalizarNombrePlato,
  reemplazarIngredientesReceta,
} from './_shared';

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
    estado,
    dificultad,
    pasos,
    ingredientes,
    notas_hildegardianas,
    interpretacion_hildegardiana,
    dia_semana_id,
    plato_nombre,
    plato_descripcion,
  } = body;

  const platoNombreNormalizado = normalizarNombrePlato(plato_nombre);
  let platoIdFinal = typeof plato_id === 'string' && plato_id.trim() ? plato_id.trim() : null;
  let platoCreadoId: string | null = null;

  if (!platoIdFinal) {
    const diaNormalizado = normalizarDiaSemana(dia_semana_id);

    const { data: restauranteConSlug } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('slug', 'resto-presta-bingen-all')
      .maybeSingle();

    let restauranteId = restauranteConSlug?.id || null;
    if (!restauranteId) {
      const { data: primerRestaurante } = await supabase
        .from('restaurantes')
        .select('id')
        .limit(1)
        .maybeSingle();
      restauranteId = primerRestaurante?.id || null;
    }

    if (!restauranteId) {
      return NextResponse.json(
        { error: 'No hay restaurante configurado para crear un plato nuevo' },
        { status: 500 }
      );
    }

    const { data: platoCreado, error: errorPlatoCreado } = await supabase
      .from('platos')
      .insert({
        nombre: platoNombreNormalizado,
        categoria_id: 2,
        restaurante_id: restauranteId,
        precio: 0,
        disponible: true,
        dia_semana_id: diaNormalizado,
        disponible_todos_dias: diaNormalizado === null,
      })
      .select('id')
      .single();

    if (errorPlatoCreado || !platoCreado) {
      return NextResponse.json(
        { error: errorPlatoCreado?.message || 'No se pudo crear el plato nuevo' },
        { status: 500 }
      );
    }

    platoIdFinal = platoCreado.id;
    platoCreadoId = platoCreado.id;
  }

  let recetaId: string | null = null;

  try {
    const { data: receta, error } = await supabase
      .from('recetas')
      .insert({
        plato_id: platoIdFinal,
        tiempo_min,
        porciones,
        porciones_base: porciones && porciones > 0 ? porciones : 1,
        dificultad,
        pasos,
        ingredientes,
        notas_hildegardianas,
        interpretacion_hildegardiana,
      })
      .select('id, estado')
      .single();

    if (error || !receta) {
      return NextResponse.json({ error: error?.message || 'No se pudo crear la receta' }, { status: 500 });
    }

    recetaId = receta.id;

    if (estado && estado !== 'borrador') {
      const { error: errorEstado } = await supabase.rpc('cambiar_estado_receta', {
        p_receta_id: receta.id,
        p_nuevo_estado: estado,
      });

      if (errorEstado) {
        throw errorEstado;
      }
    }

    await reemplazarIngredientesReceta(supabase, receta.id, ingredientes);
    await actualizarDatosPlato(supabase, platoIdFinal, platoNombreNormalizado, dia_semana_id, plato_descripcion);

    return NextResponse.json({ receta });
  } catch (error: any) {
    if (recetaId) {
      await supabase.from('recetas').delete().eq('id', recetaId);
    }
    if (platoCreadoId) {
      await supabase.from('platos').delete().eq('id', platoCreadoId);
    }

    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ese plato ya tiene una receta asociada' }, { status: 409 });
    }

    return NextResponse.json({ error: error.message || 'Error al guardar receta' }, { status: 500 });
  }
}

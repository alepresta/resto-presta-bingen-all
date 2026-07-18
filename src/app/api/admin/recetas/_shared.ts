type SupabaseClientLike = {
  from: (table: string) => any;
};

import { NextResponse } from 'next/server';
import { getUsuarioConRol } from '@/lib/supabase/server';

interface IngredienteEntrada {
  ingrediente_id: string;
  cantidad: number;
  unidad: string;
  notas: string | null;
  orden: number;
}

export type EstadoReceta = 'borrador' | 'en_proceso' | 'aprobada';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

export function normalizarDiaSemana(valor: unknown): number | null {
  if (valor === null || valor === '' || valor === undefined) return null;

  const dia = Number(valor);
  if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
    throw new Error('dia_semana_id debe ser 1-7 o null');
  }

  return dia;
}

export function normalizarNombrePlato(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new Error('plato_nombre debe ser texto');
  }

  const nombre = valor.trim();
  if (!nombre) {
    throw new Error('Debés indicar el nombre del plato');
  }

  return nombre;
}

export function normalizarIngredientes(valor: unknown): IngredienteEntrada[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((item, index) => {
    if (!esObjeto(item)) return [];

    const ingredienteId = typeof item.ingrediente_id === 'string' ? item.ingrediente_id.trim() : '';
    if (!ingredienteId || ingredienteId.startsWith('jsonb:')) return [];

    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('Cada ingrediente debe tener una cantidad mayor a 0');
    }

    const unidad = typeof item.unidad === 'string' && item.unidad.trim() ? item.unidad.trim() : 'gramos';
    const notas = typeof item.notas === 'string' && item.notas.trim() ? item.notas.trim() : null;

    return [{ ingrediente_id: ingredienteId, cantidad, unidad, notas, orden: index }];
  });
}

export function normalizarEstadoReceta(valor: unknown): EstadoReceta {
  if (valor === 'borrador' || valor === 'en_proceso' || valor === 'aprobada') {
    return valor;
  }

  return 'borrador';
}

export async function actualizarEstadoReceta(
  supabase: SupabaseClientLike,
  recetaId: string,
  estado: EstadoReceta
) {
  const ahora = new Date().toISOString();
  const actualizacion: Record<string, unknown> = {
    estado,
    fecha_cambio_estado: ahora,
  };

  if (estado === 'borrador') actualizacion.fecha_borrador = ahora;
  if (estado === 'en_proceso') actualizacion.fecha_en_proceso = ahora;
  if (estado === 'aprobada') actualizacion.fecha_aprobada = ahora;

  const { error } = await supabase
    .from('recetas')
    .update(actualizacion)
    .eq('id', recetaId);

  if (error) throw error;
}

export async function reemplazarIngredientesReceta(
  supabase: SupabaseClientLike,
  recetaId: string,
  ingredientes: unknown
) {
  const ingredientesNormalizados = normalizarIngredientes(ingredientes);

  const { error: deleteError } = await supabase.from('receta_ingredientes').delete().eq('receta_id', recetaId);
  if (deleteError) throw deleteError;

  if (ingredientesNormalizados.length === 0) return;

  const filas = ingredientesNormalizados.map((ingrediente) => ({
    receta_id: recetaId,
    ingrediente_id: ingrediente.ingrediente_id,
    cantidad: ingrediente.cantidad,
    unidad: ingrediente.unidad,
    notas: ingrediente.notas,
    orden: ingrediente.orden,
  }));

  const { error: insertError } = await supabase.from('receta_ingredientes').insert(filas);
  if (insertError) throw insertError;
}

export async function actualizarDiaPlato(
  supabase: SupabaseClientLike,
  platoId: string,
  diaSemanaId: unknown
) {
  const diaNormalizado = normalizarDiaSemana(diaSemanaId);

  const { error } = await supabase
    .from('platos')
    .update({
      dia_semana_id: diaNormalizado,
      disponible_todos_dias: diaNormalizado === null,
    })
    .eq('id', platoId);

  if (error) throw error;
}

export function normalizarDescripcionPlato(valor: unknown): string | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== 'string') {
    throw new Error('plato_descripcion debe ser texto');
  }

  const descripcion = valor.trim();
  return descripcion ? descripcion : null;
}

export async function actualizarDatosPlato(
  supabase: SupabaseClientLike,
  platoId: string,
  nombre: unknown,
  diaSemanaId: unknown,
  descripcion?: unknown
) {
  const diaNormalizado = normalizarDiaSemana(diaSemanaId);
  const nombreNormalizado = normalizarNombrePlato(nombre);
  const descripcionNormalizada = normalizarDescripcionPlato(descripcion);

  const actualizacion: Record<string, unknown> = {
    nombre: nombreNormalizado,
    dia_semana_id: diaNormalizado,
    disponible_todos_dias: diaNormalizado === null,
  };

  if (descripcionNormalizada !== undefined) {
    actualizacion.descripcion = descripcionNormalizada;
  }

  const { error } = await supabase
    .from('platos')
    .update(actualizacion)
    .eq('id', platoId);

  if (error) throw error;
}

export async function autorizarRecetas(method: string) {
  const usuario = await getUsuarioConRol();

  if (!usuario) {
    return NextResponse.json({ error: 'Sesión expirada. Volvé a iniciar sesión.' }, { status: 401 });
  }

  if (method === 'GET') {
    if (usuario.rol === 'admin' || usuario.rol === 'lector') {
      return null;
    }
  } else if (usuario.rol === 'admin') {
    return null;
  }

  return NextResponse.json({ error: 'No tenés permisos para modificar recetas' }, { status: 403 });
}
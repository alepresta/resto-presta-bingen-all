// ============================================================
// Helper de servidor: obtiene una receta + ingredientes desde
// Supabase y construye el Informe Dual. Compartido por el
// endpoint de admin y el público del menú.
// ============================================================
import {
  construirInformeDual,
  type InformeDual,
  type RecetaIngredienteInforme,
} from './informe-dual';

export interface ResultadoInforme {
  informe: InformeDual | null;
  nombre: string;
  error?: string;
  status?: number;
}

/**
 * Construye el informe dual de una receta identificada por `recetaId`.
 * `porcionesSolicitadas` es opcional; si no se indica se usa la base.
 */
export async function obtenerInformeDualPorReceta(
  supabase: any,
  recetaId: string,
  porcionesSolicitadas?: number | null
): Promise<ResultadoInforme> {
  const { data: receta, error } = await supabase
    .from('recetas')
    .select('*, platos:plato_id (nombre)')
    .eq('id', recetaId)
    .single();

  if (error || !receta) {
    return {
      informe: null,
      nombre: '',
      error: error?.message || 'Receta no encontrada',
      status: 404,
    };
  }

  const { data: riData, error: errIng } = await supabase
    .from('receta_ingredientes')
    .select('cantidad, unidad, ingrediente:ingredientes(*)')
    .eq('receta_id', recetaId)
    .order('orden');

  if (errIng) {
    return { informe: null, nombre: '', error: errIng.message, status: 500 };
  }

  const ingredientes = (riData || []).map((ri: any) => ({
    cantidad: Number(ri.cantidad) || 0,
    unidad: ri.unidad || 'gramos',
    ingrediente: Array.isArray(ri.ingrediente) ? ri.ingrediente[0] : ri.ingrediente,
  })) as RecetaIngredienteInforme[];

  // porciones_base viene de la migracion 0007; si no existe, el plan manda base 4.
  const porcionesBase = receta.porciones_base || 4;
  const porcionesObjetivo = Math.max(1, porcionesSolicitadas || porcionesBase);

  const nombreReceta = Array.isArray(receta.platos)
    ? (receta.platos[0] as any)?.nombre
    : (receta.platos as any)?.nombre;

  const informe = construirInformeDual(
    {
      nombre: nombreReceta || 'Receta',
      porciones_base: porcionesBase,
      peso_crudo_total_g: receta.peso_crudo_total_g,
      peso_cocido_total_g: receta.peso_cocido_total_g,
      metodo_coccion_principal: receta.metodo_coccion_principal,
      ingredientes,
    },
    porcionesObjetivo
  );

  return { informe, nombre: nombreReceta || 'Receta' };
}

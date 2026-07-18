import { createServerSupabaseClient } from '@/lib/supabase-server';
import EditarRecetaForm from './EditarRecetaForm';
import InformeDualView from './InformeDualView';

export const dynamic = 'force-dynamic';

interface IngredienteSeleccionado {
  ingrediente_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface DatosInicialesReceta {
  platoId: string;
  platoNombre: string;
  platoDescripcion: string;
  tiempoMin: number;
  porciones: number;
  dificultad: string;
  diaSemanaId: string;
  pasos: string[];
  ingredientes: IngredienteSeleccionado[];
  notasHildegardianas: string;
  interpretacionHildegardiana: string;
}

// Los pasos pueden estar guardados como strings o como objetos {paso, descripcion}.
// Normalizamos siempre a un arreglo de textos.
function normalizarPasos(pasos: any): string[] {
  if (!Array.isArray(pasos)) return [''];
  const out = pasos
    .map((p) => {
      if (typeof p === 'string') return p;
      if (p && typeof p === 'object') return p.descripcion || p.texto || p.paso_texto || '';
      return p == null ? '' : String(p);
    })
    .filter((s: string) => s.trim() !== '');
  return out.length > 0 ? out : [''];
}

export default async function EditarRecetaPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const esNueva = params.id === 'nueva';

  const { data: recetasExistentes } = await supabase.from('recetas').select('id, plato_id');
  const platoIdPorReceta = new Map<string, string>((recetasExistentes || []).map((r) => [r.id, r.plato_id]));
  const recetaIdPorPlato = new Map<string, string>((recetasExistentes || []).map((r) => [r.plato_id, r.id]));
  const platoActualId = esNueva ? null : platoIdPorReceta.get(params.id) || null;

  // Platos disponibles para el selector
  const { data: platosData } = await supabase
    .from('platos')
    .select('id, nombre, categoria_id, dia_semana_id')
    .eq('disponible', true)
    .order('nombre');
  let platos = (platosData || [])
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      dia_semana_id: p.dia_semana_id ?? null,
      receta_existente_id: recetaIdPorPlato.get(p.id) ?? null,
      ocupado: recetaIdPorPlato.has(p.id) && p.id !== platoActualId,
    }));

  // En creación, mostrar solo platos sin receta para evitar bloqueos por unicidad.
  if (esNueva) {
    platos = platos.filter((p) => !p.receta_existente_id);
  }

  // En edición, el plato actual puede estar no disponible y no venir en `platosData`.
  // Lo agregamos para que siga visible en el selector.
  if (!esNueva && platoActualId && !platos.some((p) => p.id === platoActualId)) {
    const { data: platoActual } = await supabase
      .from('platos')
      .select('id, nombre, dia_semana_id')
      .eq('id', platoActualId)
      .maybeSingle();

    if (platoActual) {
      platos.unshift({
        id: platoActual.id,
        nombre: platoActual.nombre,
        dia_semana_id: platoActual.dia_semana_id ?? null,
        receta_existente_id: recetaIdPorPlato.get(platoActual.id) ?? null,
        ocupado: false,
      });
    }
  }

  // Datos iniciales por defecto (receta nueva)
  let initial: DatosInicialesReceta = {
    platoId: '',
    platoNombre: '',
    platoDescripcion: '',
    tiempoMin: 30,
    porciones: 4,
    dificultad: 'media',
    diaSemanaId: '',
    pasos: [''] as string[],
    ingredientes: [] as IngredienteSeleccionado[],
    notasHildegardianas: '',
    interpretacionHildegardiana: '',
  };

  if (!esNueva) {
    const { data: r } = await supabase.from('recetas').select('*').eq('id', params.id).single();

    if (r) {
      // El plato asociado puede no estar "disponible" y no aparecer en `platosData`.
      // Lo consultamos directo para precargar correctamente nombre, descripción y día en edición.
      const { data: platoActual } = await supabase
        .from('platos')
        .select('nombre, descripcion, dia_semana_id')
        .eq('id', r.plato_id)
        .maybeSingle();

      // Ingredientes de la tabla relacional
      const { data: riData } = await supabase
        .from('receta_ingredientes')
        .select('cantidad, unidad, orden, ingrediente:ingredientes(id, nombre)')
        .eq('receta_id', params.id)
        .order('orden');

      let ingredientes: IngredienteSeleccionado[] = (riData || [])
        .filter((ri: any) => ri.ingrediente)
        .map((ri: any) => ({
          ingrediente_id: ri.ingrediente.id,
          nombre: ri.ingrediente.nombre,
          cantidad: Number(ri.cantidad) || 0,
          unidad: ri.unidad || 'gramos',
        }));

      // Fallback: si no hay en la tabla relacional, resolver desde el JSONB antiguo
      if (ingredientes.length === 0 && Array.isArray(r.ingredientes) && r.ingredientes.length > 0) {
        const { data: catalogo } = await supabase.from('ingredientes').select('id, nombre');
        const norm = (s: string) => (s || '').toString().trim().toLowerCase();
        const porId = new Map<string, any>((catalogo || []).map((i) => [i.id, i]));
        const porNombre = new Map<string, any>((catalogo || []).map((i) => [norm(i.nombre), i]));

        ingredientes = r.ingredientes.map((ing: any) => {
          const match = ing.ingrediente_id ? porId.get(ing.ingrediente_id) : porNombre.get(norm(ing.nombre));
          return {
            ingrediente_id: match?.id || ing.ingrediente_id || `jsonb:${ing.nombre || 'desconocido'}`,
            nombre: match?.nombre || ing.nombre || 'Ingrediente',
            cantidad: Number(ing.cantidad) || 0,
            unidad: ing.unidad || 'gramos',
          };
        });
      }

      initial = {
        platoId: r.plato_id || '',
        platoNombre: platoActual?.nombre || (platosData || []).find((x) => x.id === r.plato_id)?.nombre || '',
        platoDescripcion: platoActual?.descripcion || '',
        tiempoMin: r.tiempo_min || 30,
        porciones: r.porciones || 4,
        dificultad: r.dificultad || 'media',
        diaSemanaId: (() => {
          if (platoActual?.dia_semana_id != null) return String(platoActual.dia_semana_id);
          const p = (platosData || []).find((x) => x.id === r.plato_id);
          return p?.dia_semana_id != null ? String(p.dia_semana_id) : '';
        })(),
        pasos: normalizarPasos(r.pasos),
        ingredientes,
        notasHildegardianas: r.notas_hildegardianas || '',
        interpretacionHildegardiana: r.interpretacion_hildegardiana || '',
      };
    }
  }

  return (
    <>
      <EditarRecetaForm recetaId={params.id} platos={platos} initial={initial} />
      {!esNueva && (
        <div className="bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto px-4 pb-8">
            <InformeDualView recetaId={params.id} />
          </div>
        </div>
      )}
    </>
  );
}

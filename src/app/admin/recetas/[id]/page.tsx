import { createServerSupabaseClient } from '@/lib/supabase-server';
import EditarRecetaForm from './EditarRecetaForm';

export const dynamic = 'force-dynamic';

interface IngredienteSeleccionado {
  ingrediente_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
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

  // Platos disponibles para el selector
  const { data: platosData } = await supabase
    .from('platos')
    .select('id, nombre, categoria_id, dia_semana_id')
    .eq('disponible', true)
    .order('nombre');
  const platos = (platosData || []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    dia_semana_id: p.dia_semana_id ?? null,
  }));

  // Datos iniciales por defecto (receta nueva)
  let initial = {
    platoId: '',
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
        tiempoMin: r.tiempo_min || 30,
        porciones: r.porciones || 4,
        dificultad: r.dificultad || 'media',
        diaSemanaId: (() => {
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

  return <EditarRecetaForm recetaId={params.id} platos={platos} initial={initial} />;
}

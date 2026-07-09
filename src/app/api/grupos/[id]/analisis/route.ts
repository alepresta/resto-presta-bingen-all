import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// Valores diarios de referencia (aprox.)
const VDR = {
  calorias: 2000, proteinas: 50, carbohidratos: 275, grasas: 78,
  fibra: 25, sodio: 2300, calcio: 1000, hierro: 18, vitaminaC: 90,
};

function normalizarAGramos(cantidad: number, unidad: string): number {
  const u = (unidad || '').toLowerCase();
  if (u === 'kg' || u === 'kilogramos') return cantidad * 1000;
  if (u === 'gramos' || u === 'g') return cantidad;
  if (u === 'litros' || u === 'l') return cantidad * 1000;
  if (u === 'ml' || u === 'mililitros') return cantidad;
  if (u === 'tazas') return cantidad * 240;
  if (u === 'cucharadas') return cantidad * 15;
  if (u === 'cucharadita') return cantidad * 5;
  if (u === 'unidades' || u === 'unidad') return cantidad * 100; // estimación
  return cantidad;
}

function nutricionVacia() {
  return {
    calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0,
    fibra: 0, sodio: 0, calcio: 0, hierro: 0, vitaminaC: 0,
  };
}

type Nutricion = ReturnType<typeof nutricionVacia>;

function acumular(dest: Nutricion, src: Nutricion, factor = 1) {
  dest.calorias += src.calorias * factor;
  dest.proteinas += src.proteinas * factor;
  dest.carbohidratos += src.carbohidratos * factor;
  dest.grasas += src.grasas * factor;
  dest.fibra += src.fibra * factor;
  dest.sodio += src.sodio * factor;
  dest.calcio += src.calcio * factor;
  dest.hierro += src.hierro * factor;
  dest.vitaminaC += src.vitaminaC * factor;
}

// GET /api/grupos/[id]/analisis - Análisis nutricional e hildegardiano del grupo
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    // 1. Items del grupo
    const { data: items } = await supabase
      .from('grupo_items')
      .select('id, fecha, tipo_comida, cantidad, plato_id')
      .eq('grupo_id', params.id);

    if (!items || items.length === 0) {
      return NextResponse.json({
        vacio: true,
        total: nutricionVacia(),
        porDia: {},
        porPlato: [],
        hildegardiano: null,
      });
    }

    const platoIds = [...new Set(items.map((i) => i.plato_id).filter(Boolean))];

    // 2. Platos
    const { data: platos } = await supabase
      .from('platos')
      .select('id, nombre, precio')
      .in('id', platoIds);
    const platoPorId = new Map((platos || []).map((p) => [p.id, p]));

    // 3. Recetas de esos platos
    const { data: recetas } = await supabase
      .from('recetas')
      .select('id, plato_id, porciones, pasos, tiempo_min, dificultad, notas_hildegardianas')
      .in('plato_id', platoIds);
    const recetaPorPlato = new Map((recetas || []).map((r) => [r.plato_id, r]));
    const recetaIds = (recetas || []).map((r) => r.id);

    // 4. Ingredientes de las recetas
    const { data: recetaIngredientes } = await supabase
      .from('receta_ingredientes')
      .select(`
        receta_id, cantidad, unidad,
        ingrediente:ingredientes(
          id, nombre, temperamento, es_veneno_hildegardiano,
          calorias, proteinas_g, carbohidratos_g, grasas_g, fibra_g,
          sodio_mg, calcio_mg, hierro_mg, vitamina_c_mg
        )
      `)
      .in('receta_id', recetaIds.length ? recetaIds : ['00000000-0000-0000-0000-000000000000']);

    // 5. Nutrición por porción + receta detallada, por plato
    const porPlato = platoIds.map((platoId) => {
      const plato = platoPorId.get(platoId);
      const receta = recetaPorPlato.get(platoId);
      const nutricion = nutricionVacia();
      const temperamentos: Record<string, number> = {};
      const venenos: string[] = [];
      const ingredientesReceta: Array<{ nombre: string; cantidad: number; unidad: string; temperamento: string | null; veneno: boolean }> = [];

      const porciones = receta?.porciones || 1;
      const ings = (recetaIngredientes || []).filter((ri: any) => receta && ri.receta_id === receta.id);

      ings.forEach((ri: any) => {
        const ing = ri.ingrediente;
        if (!ing) return;

        ingredientesReceta.push({
          nombre: ing.nombre,
          cantidad: ri.cantidad,
          unidad: ri.unidad,
          temperamento: ing.temperamento,
          veneno: !!ing.es_veneno_hildegardiano,
        });

        // Nutrición por porción
        const gramosTotales = normalizarAGramos(ri.cantidad, ri.unidad);
        const gramosPorPorcion = gramosTotales / porciones;
        const factor = gramosPorPorcion / 100;

        nutricion.calorias += (ing.calorias || 0) * factor;
        nutricion.proteinas += (ing.proteinas_g || 0) * factor;
        nutricion.carbohidratos += (ing.carbohidratos_g || 0) * factor;
        nutricion.grasas += (ing.grasas_g || 0) * factor;
        nutricion.fibra += (ing.fibra_g || 0) * factor;
        nutricion.sodio += (ing.sodio_mg || 0) * factor;
        nutricion.calcio += (ing.calcio_mg || 0) * factor;
        nutricion.hierro += (ing.hierro_mg || 0) * factor;
        nutricion.vitaminaC += (ing.vitamina_c_mg || 0) * factor;

        if (ing.temperamento) {
          temperamentos[ing.temperamento] = (temperamentos[ing.temperamento] || 0) + (ing.calorias || 0) * factor;
        }
        if (ing.es_veneno_hildegardiano) venenos.push(ing.nombre);
      });

      return {
        plato_id: platoId,
        nombre: plato?.nombre || 'Plato',
        precio: plato?.precio || 0,
        nutricion,
        temperamentos,
        venenos,
        receta: receta
          ? {
              porciones,
              tiempo_min: receta.tiempo_min,
              dificultad: receta.dificultad,
              pasos: receta.pasos || [],
              notas_hildegardianas: receta.notas_hildegardianas,
              ingredientes: ingredientesReceta,
            }
          : null,
      };
    });

    const nutricionPorPlato = new Map(porPlato.map((p) => [p.plato_id, p.nutricion]));

    // 6. Totales y por día (escalando por cantidad del item)
    const total = nutricionVacia();
    const porDia: Record<string, Nutricion & { platos: number }> = {};
    const temperamentosTotal: Record<string, number> = {};
    const venenosTotal = new Set<string>();

    items.forEach((item) => {
      const n = nutricionPorPlato.get(item.plato_id);
      if (!n) return;
      const cant = item.cantidad || 1;

      acumular(total, n, cant);

      if (!porDia[item.fecha]) porDia[item.fecha] = { ...nutricionVacia(), platos: 0 };
      acumular(porDia[item.fecha], n, cant);
      porDia[item.fecha].platos += 1;

      const pp = porPlato.find((p) => p.plato_id === item.plato_id);
      if (pp) {
        Object.entries(pp.temperamentos).forEach(([t, cal]) => {
          temperamentosTotal[t] = (temperamentosTotal[t] || 0) + cal * cant;
        });
        pp.venenos.forEach((v) => venenosTotal.add(v));
      }
    });

    // 7. Análisis hildegardiano (balance cálido/frío + venenos)
    const caloriasCalidas =
      (temperamentosTotal['calido'] || 0) +
      (temperamentosTotal['calido_seco'] || 0) +
      (temperamentosTotal['calido_humedo'] || 0);
    const caloriasFrias =
      (temperamentosTotal['frio'] || 0) +
      (temperamentosTotal['frio_seco'] || 0) +
      (temperamentosTotal['frio_humedo'] || 0);
    const totalTemp = caloriasCalidas + caloriasFrias;
    const porcCalido = totalTemp > 0 ? (caloriasCalidas / totalTemp) * 100 : 0;
    const porcFrio = totalTemp > 0 ? (caloriasFrias / totalTemp) * 100 : 0;

    let balanceMsg = 'Sin datos de temperamento';
    if (totalTemp > 0) {
      if (porcCalido > 65) balanceMsg = 'Menú predominantemente cálido 🔥';
      else if (porcFrio > 65) balanceMsg = 'Menú predominantemente frío ❄️';
      else balanceMsg = 'Balance cálido/frío equilibrado ⚖️';
    }

    const diasConDatos = Object.keys(porDia).length;
    const promedioDiario = diasConDatos > 0 ? {
      calorias: total.calorias / diasConDatos,
      proteinas: total.proteinas / diasConDatos,
      carbohidratos: total.carbohidratos / diasConDatos,
      grasas: total.grasas / diasConDatos,
      fibra: total.fibra / diasConDatos,
      sodio: total.sodio / diasConDatos,
      calcio: total.calcio / diasConDatos,
      hierro: total.hierro / diasConDatos,
      vitaminaC: total.vitaminaC / diasConDatos,
    } : null;

    return NextResponse.json({
      vacio: false,
      total,
      promedioDiario,
      vdr: VDR,
      porDia,
      porPlato,
      diasConDatos,
      hildegardiano: {
        porcCalido,
        porcFrio,
        balance: balanceMsg,
        venenos: Array.from(venenosTotal),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

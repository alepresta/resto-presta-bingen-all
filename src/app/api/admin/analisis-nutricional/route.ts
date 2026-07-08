import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

const VDR = {
  calorias: 2000,
  proteinas: 50,
  carbohidratos: 275,
  grasas: 78,
  grasas_saturadas: 20,
  fibra: 25,
  sodio: 2300,
  calcio: 1000,
  hierro: 18,
  magnesio: 400,
  potasio: 3500,
  zinc: 15,
  fosforo: 1000,
  cobre: 0.9,
  manganeso: 2.3,
  selenio: 55,
  yodo: 150,
  vitaminaA: 900,
  vitaminaC: 90,
  vitaminaD: 20,
  vitaminaE: 15,
  vitaminaK: 120,
  vitaminaB1: 1.2,
  vitaminaB2: 1.3,
  vitaminaB3: 16,
  vitaminaB5: 5,
  vitaminaB6: 1.7,
  vitaminaB9: 400,
  vitaminaB12: 2.4,
};

function normalizarACantidadBase(cantidad: number, unidad: string): { cantidad: number; unidadBase: string } {
  const u = unidad.toLowerCase();
  if (u === 'kg' || u === 'kilogramos') return { cantidad: cantidad * 1000, unidadBase: 'gramos' };
  if (u === 'gramos' || u === 'g') return { cantidad, unidadBase: 'gramos' };
  if (u === 'litros' || u === 'l') return { cantidad: cantidad * 1000, unidadBase: 'ml' };
  if (u === 'ml' || u === 'mililitros') return { cantidad, unidadBase: 'ml' };
  if (u === 'tazas') return { cantidad: cantidad * 240, unidadBase: 'ml' };
  if (u === 'cucharadas') return { cantidad: cantidad * 15, unidadBase: 'ml' };
  if (u === 'cucharadita') return { cantidad: cantidad * 5, unidadBase: 'ml' };
  if (u === 'unidades' || u === 'unidad') return { cantidad, unidadBase: 'unidades' };
  return { cantidad, unidadBase: u };
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const fechaInicio = searchParams.get('inicio');
  const fechaFin = searchParams.get('fin');

  if (!fechaInicio || !fechaFin) {
    return NextResponse.json({ error: 'Faltan parámetros inicio y fin' }, { status: 400 });
  }

  try {
    const { data: pedidos, error: errorPedidos } = await supabase
      .from('grupos_pedido')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        items:grupo_items(
          id,
          fecha,
          tipo_comida,
          cantidad,
          plato_id,
          platos:platos(id, nombre, categoria_id)
        )
      `)
      .eq('estado', 'confirmado')
      .lte('fecha_inicio', fechaFin)
      .gte('fecha_fin', fechaInicio);

    if (errorPedidos) throw errorPedidos;

    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({
        mensaje: 'No hay pedidos confirmados en este rango',
        resumen: null,
        porDia: {},
        alertas: [],
      });
    }

    const itemsTodos: any[] = [];
    pedidos.forEach((pedido) => {
      pedido.items?.forEach((item: any) => {
        if (item.plato_id) itemsTodos.push(item);
      });
    });

    if (itemsTodos.length === 0) {
      return NextResponse.json({
        mensaje: 'No hay items en los pedidos confirmados',
        resumen: null,
        porDia: {},
        alertas: [],
      });
    }

    const platoIds = [...new Set(itemsTodos.map((i) => i.plato_id))];
    const { data: recetas } = await supabase
      .from('recetas')
      .select('id, plato_id, porciones')
      .in('plato_id', platoIds);

    const recetaPorPlato = new Map<string, { id: string; porciones: number }>();
    recetas?.forEach((r) => recetaPorPlato.set(r.plato_id, { id: r.id, porciones: r.porciones || 1 }));

    const recetaIds = Array.from(recetaPorPlato.values()).map((r) => r.id);
    
    const { data: recetaIngredientes } = await supabase
      .from('receta_ingredientes')
      .select(`
        receta_id,
        cantidad,
        unidad,
        ingrediente:ingredientes(
          id, nombre, categoria,
          calorias, proteinas_g, carbohidratos_g, grasas_g, grasas_saturadas_g, fibra_g, azucar_g,
          sodio_mg, calcio_mg, hierro_mg, magnesio_mg, potasio_mg, zinc_mg, fosforo_mg, cobre_mg, manganeso_mg, selenio_mcg, yodo_mcg,
          vitamina_a_mcg, vitamina_c_mg, vitamina_d_mcg, vitamina_e_mg, vitamina_k_mcg,
          vitamina_b1_mg, vitamina_b2_mg, vitamina_b3_mg, vitamina_b5_mg, vitamina_b6_mg, vitamina_b9_mcg, vitamina_b12_mcg,
          indice_glucemico, temperamento
        )
      `)
      .in('receta_id', recetaIds);

    const totalNutricion = {
      calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, grasas_saturadas: 0, fibra: 0, azucar: 0,
      sodio: 0, calcio: 0, hierro: 0, magnesio: 0, potasio: 0, zinc: 0, fosforo: 0, cobre: 0, manganeso: 0, selenio: 0, yodo: 0,
      vitaminaA: 0, vitaminaC: 0, vitaminaD: 0, vitaminaE: 0, vitaminaK: 0,
      vitaminaB1: 0, vitaminaB2: 0, vitaminaB3: 0, vitaminaB5: 0, vitaminaB6: 0, vitaminaB9: 0, vitaminaB12: 0,
      platosTotal: 0, porcionesTotal: 0,
    };

    const porDia: Record<string, any> = {};

    itemsTodos.forEach((item) => {
      const receta = recetaPorPlato.get(item.plato_id);
      if (!receta) return;

      const factorEscala = (item.cantidad || 1) / receta.porciones;

      recetaIngredientes
        ?.filter((ri) => ri.receta_id === receta.id)
        .forEach((ri: any) => {
          const ing = ri.ingrediente;
          if (!ing) return;

          const { cantidad: cantidadBase } = normalizarACantidadBase(ri.cantidad, ri.unidad);
          const cantidadEscalada = cantidadBase * factorEscala;
          const factor = cantidadEscalada / 100;

          // Macros
          totalNutricion.calorias += (ing.calorias || 0) * factor;
          totalNutricion.proteinas += (ing.proteinas_g || 0) * factor;
          totalNutricion.carbohidratos += (ing.carbohidratos_g || 0) * factor;
          totalNutricion.grasas += (ing.grasas_g || 0) * factor;
          totalNutricion.grasas_saturadas += (ing.grasas_saturadas_g || 0) * factor;
          totalNutricion.fibra += (ing.fibra_g || 0) * factor;
          totalNutricion.azucar += (ing.azucar_g || 0) * factor;

          // Minerales
          totalNutricion.sodio += (ing.sodio_mg || 0) * factor;
          totalNutricion.calcio += (ing.calcio_mg || 0) * factor;
          totalNutricion.hierro += (ing.hierro_mg || 0) * factor;
          totalNutricion.magnesio += (ing.magnesio_mg || 0) * factor;
          totalNutricion.potasio += (ing.potasio_mg || 0) * factor;
          totalNutricion.zinc += (ing.zinc_mg || 0) * factor;
          totalNutricion.fosforo += (ing.fosforo_mg || 0) * factor;
          totalNutricion.cobre += (ing.cobre_mg || 0) * factor;
          totalNutricion.manganeso += (ing.manganeso_mg || 0) * factor;
          totalNutricion.selenio += (ing.selenio_mcg || 0) * factor;
          totalNutricion.yodo += (ing.yodo_mcg || 0) * factor;

          // Vitaminas
          totalNutricion.vitaminaA += (ing.vitamina_a_mcg || 0) * factor;
          totalNutricion.vitaminaC += (ing.vitamina_c_mg || 0) * factor;
          totalNutricion.vitaminaD += (ing.vitamina_d_mcg || 0) * factor;
          totalNutricion.vitaminaE += (ing.vitamina_e_mg || 0) * factor;
          totalNutricion.vitaminaK += (ing.vitamina_k_mcg || 0) * factor;
          totalNutricion.vitaminaB1 += (ing.vitamina_b1_mg || 0) * factor;
          totalNutricion.vitaminaB2 += (ing.vitamina_b2_mg || 0) * factor;
          totalNutricion.vitaminaB3 += (ing.vitamina_b3_mg || 0) * factor;
          totalNutricion.vitaminaB5 += (ing.vitamina_b5_mg || 0) * factor;
          totalNutricion.vitaminaB6 += (ing.vitamina_b6_mg || 0) * factor;
          totalNutricion.vitaminaB9 += (ing.vitamina_b9_mcg || 0) * factor;
          totalNutricion.vitaminaB12 += (ing.vitamina_b12_mcg || 0) * factor;

          // Por día
          if (!porDia[item.fecha]) {
            porDia[item.fecha] = {
              calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, sodio: 0, platos: 0,
            };
          }
          porDia[item.fecha].calorias += (ing.calorias || 0) * factor;
          porDia[item.fecha].proteinas += (ing.proteinas_g || 0) * factor;
          porDia[item.fecha].carbohidratos += (ing.carbohidratos_g || 0) * factor;
          porDia[item.fecha].grasas += (ing.grasas_g || 0) * factor;
          porDia[item.fecha].sodio += (ing.sodio_mg || 0) * factor;
          porDia[item.fecha].platos += 1;
        });

      totalNutricion.platosTotal += 1;
      totalNutricion.porcionesTotal += item.cantidad || 1;
    });

    // 🔧 CORRECCIÓN: Contar solo días con platos
    const diasConDatos = Object.keys(porDia).length;
    const diasTotalesEnRango = Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diasSinDatos = diasTotalesEnRango - diasConDatos;

    // 🔧 CORRECCIÓN: Promedio solo sobre días con datos
    const promedioDiario = diasConDatos > 0 ? {
      calorias: totalNutricion.calorias / diasConDatos,
      proteinas: totalNutricion.proteinas / diasConDatos,
      carbohidratos: totalNutricion.carbohidratos / diasConDatos,
      grasas: totalNutricion.grasas / diasConDatos,
      grasas_saturadas: totalNutricion.grasas_saturadas / diasConDatos,
      fibra: totalNutricion.fibra / diasConDatos,
      sodio: totalNutricion.sodio / diasConDatos,
      calcio: totalNutricion.calcio / diasConDatos,
      hierro: totalNutricion.hierro / diasConDatos,
      magnesio: totalNutricion.magnesio / diasConDatos,
      potasio: totalNutricion.potasio / diasConDatos,
      zinc: totalNutricion.zinc / diasConDatos,
      fosforo: totalNutricion.fosforo / diasConDatos,
      cobre: totalNutricion.cobre / diasConDatos,
      manganeso: totalNutricion.manganeso / diasConDatos,
      selenio: totalNutricion.selenio / diasConDatos,
      yodo: totalNutricion.yodo / diasConDatos,
      vitaminaA: totalNutricion.vitaminaA / diasConDatos,
      vitaminaC: totalNutricion.vitaminaC / diasConDatos,
      vitaminaD: totalNutricion.vitaminaD / diasConDatos,
      vitaminaE: totalNutricion.vitaminaE / diasConDatos,
      vitaminaK: totalNutricion.vitaminaK / diasConDatos,
      vitaminaB1: totalNutricion.vitaminaB1 / diasConDatos,
      vitaminaB2: totalNutricion.vitaminaB2 / diasConDatos,
      vitaminaB3: totalNutricion.vitaminaB3 / diasConDatos,
      vitaminaB5: totalNutricion.vitaminaB5 / diasConDatos,
      vitaminaB6: totalNutricion.vitaminaB6 / diasConDatos,
      vitaminaB9: totalNutricion.vitaminaB9 / diasConDatos,
      vitaminaB12: totalNutricion.vitaminaB12 / diasConDatos,
    } : null;

    // Calcular % de VDR
    const porcentajeVDR = promedioDiario ? {
      calorias: (promedioDiario.calorias / VDR.calorias) * 100,
      proteinas: (promedioDiario.proteinas / VDR.proteinas) * 100,
      carbohidratos: (promedioDiario.carbohidratos / VDR.carbohidratos) * 100,
      grasas: (promedioDiario.grasas / VDR.grasas) * 100,
      fibra: (promedioDiario.fibra / VDR.fibra) * 100,
      sodio: (promedioDiario.sodio / VDR.sodio) * 100,
      calcio: (promedioDiario.calcio / VDR.calcio) * 100,
      hierro: (promedioDiario.hierro / VDR.hierro) * 100,
      magnesio: (promedioDiario.magnesio / VDR.magnesio) * 100,
      potasio: (promedioDiario.potasio / VDR.potasio) * 100,
      zinc: (promedioDiario.zinc / VDR.zinc) * 100,
      fosforo: (promedioDiario.fosforo / VDR.fosforo) * 100,
      vitaminaA: (promedioDiario.vitaminaA / VDR.vitaminaA) * 100,
      vitaminaC: (promedioDiario.vitaminaC / VDR.vitaminaC) * 100,
      vitaminaD: (promedioDiario.vitaminaD / VDR.vitaminaD) * 100,
      vitaminaB12: (promedioDiario.vitaminaB12 / VDR.vitaminaB12) * 100,
      vitaminaB9: (promedioDiario.vitaminaB9 / VDR.vitaminaB9) * 100,
    } : null;

    // Generar alertas
    const alertas: Array<{ tipo: 'exceso' | 'deficit' | 'info'; mensaje: string; icono: string; nutriente: string; porcentaje: number }> = [];

    if (diasSinDatos > 0) {
      alertas.push({ 
        tipo: 'info', 
        icono: '📅', 
        mensaje: `${diasSinDatos} día(s) sin platos seleccionados (no incluidos en el promedio)`,
        nutriente: 'Días sin datos',
        porcentaje: 0
      });
    }

    if (porcentajeVDR) {
      if (porcentajeVDR.sodio > 100) {
        alertas.push({ tipo: 'exceso', icono: '🧂', mensaje: `Alto en sodio (${promedioDiario!.sodio.toFixed(0)} mg/día, ${porcentajeVDR.sodio.toFixed(0)}% VDR)`, nutriente: 'Sodio', porcentaje: porcentajeVDR.sodio });
      }
      if (porcentajeVDR.proteinas < 80) {
        alertas.push({ tipo: 'deficit', icono: '', mensaje: `Bajo en proteínas (${promedioDiario!.proteinas.toFixed(1)} g/día, ${porcentajeVDR.proteinas.toFixed(0)}% VDR)`, nutriente: 'Proteínas', porcentaje: porcentajeVDR.proteinas });
      }
      if (porcentajeVDR.fibra < 80) {
        alertas.push({ tipo: 'deficit', icono: '', mensaje: `Bajo en fibra (${promedioDiario!.fibra.toFixed(1)} g/día, ${porcentajeVDR.fibra.toFixed(0)}% VDR)`, nutriente: 'Fibra', porcentaje: porcentajeVDR.fibra });
      }
      if (porcentajeVDR.calcio < 80) {
        alertas.push({ tipo: 'deficit', icono: '', mensaje: `Bajo en calcio (${promedioDiario!.calcio.toFixed(0)} mg/día, ${porcentajeVDR.calcio.toFixed(0)}% VDR)`, nutriente: 'Calcio', porcentaje: porcentajeVDR.calcio });
      }
      if (porcentajeVDR.hierro < 80) {
        alertas.push({ tipo: 'deficit', icono: '', mensaje: `Bajo en hierro (${promedioDiario!.hierro.toFixed(1)} mg/día, ${porcentajeVDR.hierro.toFixed(0)}% VDR)`, nutriente: 'Hierro', porcentaje: porcentajeVDR.hierro });
      }
      if (porcentajeVDR.vitaminaC < 80) {
        alertas.push({ tipo: 'deficit', icono: '', mensaje: `Bajo en vitamina C (${promedioDiario!.vitaminaC.toFixed(1)} mg/día, ${porcentajeVDR.vitaminaC.toFixed(0)}% VDR)`, nutriente: 'Vitamina C', porcentaje: porcentajeVDR.vitaminaC });
      }
      if (porcentajeVDR.vitaminaD < 80) {
        alertas.push({ tipo: 'deficit', icono: '', mensaje: `Bajo en vitamina D (${promedioDiario!.vitaminaD.toFixed(1)} mcg/día, ${porcentajeVDR.vitaminaD.toFixed(0)}% VDR)`, nutriente: 'Vitamina D', porcentaje: porcentajeVDR.vitaminaD });
      }
      if (porcentajeVDR.vitaminaB12 < 80) {
        alertas.push({ tipo: 'deficit', icono: '', mensaje: `Bajo en vitamina B12 (${promedioDiario!.vitaminaB12.toFixed(1)} mcg/día, ${porcentajeVDR.vitaminaB12.toFixed(0)}% VDR)`, nutriente: 'Vitamina B12', porcentaje: porcentajeVDR.vitaminaB12 });
      }
      if (porcentajeVDR.calorias > 120) {
        alertas.push({ tipo: 'exceso', icono: '', mensaje: `Alto en calorías (${promedioDiario!.calorias.toFixed(0)} kcal/día, ${porcentajeVDR.calorias.toFixed(0)}% VDR)`, nutriente: 'Calorías', porcentaje: porcentajeVDR.calorias });
      }
      if (porcentajeVDR.calorias < 80) {
        alertas.push({ tipo: 'deficit', icono: '⚠️', mensaje: `Bajo en calorías (${promedioDiario!.calorias.toFixed(0)} kcal/día, ${porcentajeVDR.calorias.toFixed(0)}% VDR)`, nutriente: 'Calorías', porcentaje: porcentajeVDR.calorias });
      }
    }

    if (alertas.length === 0) {
      alertas.push({ tipo: 'info', icono: '✅', mensaje: 'El menú está balanceado nutricionalmente (80-120% VDR)', nutriente: 'General', porcentaje: 100 });
    }

    return NextResponse.json({
      resumen: {
        ...totalNutricion,
        promedioDiario,
        porcentajeVDR,
        diasConDatos,
        diasTotalesEnRango,
        diasSinDatos,
      },
      porDia,
      alertas,
      pedidos: pedidos.length,
      rangoFechas: { inicio: fechaInicio, fin: fechaFin },
    });
  } catch (error: any) {
    console.error('Error en análisis nutricional:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

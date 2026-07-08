import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// 🌿 API DEL INFORME HILGARDIANO
// Basado en: Physica, Causae et Curae
// Principios: Subtilitat, Viriditas, Eucrasia, Discretio
// ============================================

function normalizarACantidadBase(cantidad: number, unidad: string): number {
  const u = unidad.toLowerCase();
  if (u === 'kg' || u === 'kilogramos') return cantidad * 1000;
  if (u === 'gramos' || u === 'g') return cantidad;
  if (u === 'litros' || u === 'l') return cantidad * 1000;
  if (u === 'ml' || u === 'mililitros') return cantidad;
  if (u === 'tazas') return cantidad * 240;
  if (u === 'cucharadas') return cantidad * 15;
  if (u === 'cucharadita') return cantidad * 5;
  return cantidad;
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
    // 1. Obtener pedidos confirmados
    const { data: pedidos } = await supabase
      .from('grupos_pedido')
      .select(`id, fecha_inicio, fecha_fin, estado,
        items:grupo_items(id, fecha, tipo_comida, cantidad, plato_id, 
          platos:platos(id, nombre))`)
      .eq('estado', 'confirmado')
      .lte('fecha_inicio', fechaFin)
      .gte('fecha_fin', fechaInicio);

    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({
        mensaje: 'No hay pedidos confirmados en este rango',
        informe: null,
      });
    }

    const itemsTodos: any[] = [];
    pedidos.forEach((p) => p.items?.forEach((item: any) => {
      if (item.plato_id) itemsTodos.push(item);
    }));

    if (itemsTodos.length === 0) {
      return NextResponse.json({ mensaje: 'No hay items', informe: null });
    }

    // 2. Obtener recetas
    const platoIds = [...new Set(itemsTodos.map((i) => i.plato_id))];
    const { data: recetas } = await supabase
      .from('recetas')
      .select('id, plato_id, porciones')
      .in('plato_id', platoIds);

    const recetaPorPlato = new Map<string, { id: string; porciones: number }>();
    recetas?.forEach((r) => recetaPorPlato.set(r.plato_id, { id: r.id, porciones: r.porciones || 1 }));

    const recetaIds = Array.from(recetaPorPlato.values()).map((r) => r.id);

    // 3. Obtener ingredientes con datos hildegardianos
    const { data: recetaIngredientes } = await supabase
      .from('receta_ingredientes')
      .select(`receta_id, cantidad, unidad,
        ingrediente:ingredientes(
          id, nombre, categoria, temperamento,
          es_veneno_hildegardiano, es_base_alegria, nivel_subtilitat, requiere_coccion
        )`)
      .in('receta_id', recetaIds);

    // 4. Acumular datos para el informe
    let pesoTotal = 0;
    let sumaSubtilitatPonderada = 0;
    let pesoCocidoRequerido = 0;
    let pesoCrudoEncontrado = 0;
    
    const venenosDetectados: Array<{ nombre: string; peso: number; razon: string }> = [];
    const basesAlegriaEncontradas: Set<string> = new Set();
    
    const temperamentos: Record<string, number> = {
      calido: 0, calido_seco: 0, calido_humedo: 0,
      frio: 0, frio_seco: 0, frio_humedo: 0,
    };
    
    const ingredientesPorDia: Record<string, Array<{ seco: boolean; nombre: string }>> = {};

    itemsTodos.forEach((item) => {
      const receta = recetaPorPlato.get(item.plato_id);
      if (!receta) return;

      const factorEscala = (item.cantidad || 1) / receta.porciones;

      recetaIngredientes
        ?.filter((ri) => ri.receta_id === receta.id)
        .forEach((ri: any) => {
          const ing = ri.ingrediente;
          if (!ing) return;

          const pesoGramos = normalizarACantidadBase(ri.cantidad, ri.unidad) * factorEscala;
          pesoTotal += pesoGramos;

          // 🌟 SUBTILITAT ponderada por peso
          sumaSubtilitatPonderada += (ing.nivel_subtilitat || 5) * pesoGramos;

          // 🌿 TEMPERAMENTO
          if (ing.temperamento && temperamentos[ing.temperamento] !== undefined) {
            temperamentos[ing.temperamento] += pesoGramos;
          }

          // 🚫 VENENOS
          if (ing.es_veneno_hildegardiano) {
            venenosDetectados.push({
              nombre: ing.nombre,
              peso: pesoGramos,
              razon: obtenerRazonVeneno(ing.nombre),
            });
          }

          // ✨ BASES DE ALEGRÍA
          if (ing.es_base_alegria) {
            basesAlegriaEncontradas.add(obtenerPilar(ing.nombre));
          }

          // 🔥 MADURACIÓN POR FUEGO
          if (ing.requiere_coccion) {
            pesoCocidoRequerido += pesoGramos;
          } else {
            pesoCrudoEncontrado += pesoGramos;
          }

          // 🔄 SECUENCIA COMPENSATORIA (por día)
          if (!ingredientesPorDia[item.fecha]) {
            ingredientesPorDia[item.fecha] = [];
          }
          const esSeco = ing.temperamento?.includes('seco') || false;
          ingredientesPorDia[item.fecha].push({ seco: esSeco, nombre: ing.nombre });
        });
    });

    // 5. Calcular índices

    // 🟢 ÍNDICE DE VIRIDITAS (0-10)
    const viriditas = pesoTotal > 0 ? sumaSubtilitatPonderada / pesoTotal : 0;
    
    // ⚖️ EUCRASIA (balance cálido/frío y seco/húmedo)
    const totalCalido = temperamentos.calido + temperamentos.calido_seco + temperamentos.calido_humedo;
    const totalFrio = temperamentos.frio + temperamentos.frio_seco + temperamentos.frio_humedo;
    const totalSeco = temperamentos.calido_seco + temperamentos.frio_seco;
    const totalHumedo = temperamentos.calido_humedo + temperamentos.frio_humedo;
    const totalTemperamentos = totalCalido + totalFrio;
    
    const porcentajeCalido = totalTemperamentos > 0 ? (totalCalido / totalTemperamentos) * 100 : 0;
    const porcentajeFrio = totalTemperamentos > 0 ? (totalFrio / totalTemperamentos) * 100 : 0;
    const porcentajeSeco = totalTemperamentos > 0 ? (totalSeco / totalTemperamentos) * 100 : 0;
    const porcentajeHumedo = totalTemperamentos > 0 ? (totalHumedo / totalTemperamentos) * 100 : 0;

    // Eucrasia ideal: 40-60% cálido, 40-60% seco/húmedo
    const eucrasiaCalor = porcentajeCalido >= 40 && porcentajeCalido <= 60 ? 10 :
                          porcentajeCalido >= 30 && porcentajeCalido <= 70 ? 7 : 4;
    const eucrasiaHumedad = porcentajeSeco >= 30 && porcentajeSeco <= 70 ? 10 :
                            porcentajeSeco >= 20 && porcentajeSeco <= 80 ? 7 : 4;
    const eucrasia = (eucrasiaCalor + eucrasiaHumedad) / 2;

    // 🔥 MADURACIÓN POR FUEGO
    const pesoTotalIngredientes = pesoCocidoRequerido + pesoCrudoEncontrado;
    const porcentajeCocido = pesoTotalIngredientes > 0 ? (pesoCocidoRequerido / pesoTotalIngredientes) * 100 : 0;

    // ✨ PILARES DE ALEGRÍA (4 pilares: espelta, hinojo, galanga, castañas)
    const pilaresEsperados = ['Espelta', 'Hinojo', 'Galanga', 'Castañas'];
    const pilaresPresentes = Array.from(basesAlegriaEncontradas);
    const pilaresAusentes = pilaresEsperados.filter(p => !pilaresPresentes.includes(p));

    // 🔄 SECUENCIA COMPENSATORIA
    let transicionesBuenas = 0;
    let transicionesTotales = 0;
    Object.values(ingredientesPorDia).forEach((ingredientesDia) => {
      for (let i = 1; i < ingredientesDia.length; i++) {
        transicionesTotales++;
        if (ingredientesDia[i].seco !== ingredientesDia[i - 1].seco) {
          transicionesBuenas++;
        }
      }
    });
    const porcentajeCompensacion = transicionesTotales > 0 ? (transicionesBuenas / transicionesTotales) * 100 : 0;

    // 6. Generar recomendaciones
    const recomendaciones: string[] = [];

    // Recomendaciones sobre venenos
    if (venenosDetectados.length > 0) {
      const venenosUnicos = [...new Set(venenosDetectados.map(v => v.nombre))];
      recomendaciones.push(`🚫 Eliminar venenos de cocina: ${venenosUnicos.join(', ')}. Hildegarda dice: "cargan la sangre de sustancias nocivas".`);
    }

    // Recomendaciones sobre pilares
    if (pilaresAusentes.length > 0) {
      recomendaciones.push(`✨ Agregar pilares ausentes: ${pilaresAusentes.join(', ')}. Son la base de la alegría del alma.`);
    }

    // Recomendaciones sobre cocción
    if (porcentajeCocido < 85) {
      recomendaciones.push(`🔥 Aumentar cocción al 85%+. Actualmente ${porcentajeCocido.toFixed(0)}%. Hildegarda: "casi todo debe pasar por el fuego para que los jugos maduren".`);
    }

    // Recomendaciones sobre eucrasia
    if (porcentajeCalido > 65) {
      recomendaciones.push(`💧 Menú muy cálido (${porcentajeCalido.toFixed(0)}%). Agregar ingredientes fríos para templar el exceso de ardor.`);
    } else if (porcentajeCalido < 35) {
      recomendaciones.push(`🔥 Menú muy frío (${porcentajeFrio.toFixed(0)}%). Agregar ingredientes cálidos para proteger el corazón.`);
    }

    if (porcentajeHumedo > 70) {
      recomendaciones.push(`🍃 Exceso de humedad (${porcentajeHumedo.toFixed(0)}%). Puede generar "livor" (mucosidad). Agregar ingredientes secos.`);
    }

    // Recomendación sobre espelta
    if (!basesAlegriaEncontradas.has('Espelta')) {
      recomendaciones.push(`🌾 La espelta debe ser el carbohidrato dominante. "90% del éxito de la medicina hildegardiana".`);
    }

    // Recomendación sobre compensación
    if (porcentajeCompensacion < 50) {
      recomendaciones.push(`🔄 Mejorar secuencia compensatoria. Después de un alimento seco, seguir con uno húmedo.`);
    }

    if (recomendaciones.length === 0) {
      recomendaciones.push(`✅ Menú en excelente armonía con los principios hildegardianos.`);
    }

    // 7. Diagnóstico final
    const diagnostico = generarDiagnostico(viriditas, eucrasia, venenosDetectados.length, porcentajeCocido, pilaresAusentes.length);

    return NextResponse.json({
      informe: {
        periodo: { inicio: fechaInicio, fin: fechaFin },
        diasAnalizados: Object.keys(ingredientesPorDia).length,
        
        // 🟢 VIRIDITAS
        viriditas: {
          puntaje: viriditas,
          interpretacion: interpretarViriditas(viriditas),
        },

        // ⚖️ EUCRASIA
        eucrasia: {
          puntaje: eucrasia,
          calido: porcentajeCalido,
          frio: porcentajeFrio,
          seco: porcentajeSeco,
          humedo: porcentajeHumedo,
          interpretacion: interpretarEucrasia(eucrasia),
        },

        // 🚫 VENENOS
        venenos: {
          cantidad: venenosDetectados.length,
          lista: venenosDetectados,
          interpretacion: venenosDetectados.length === 0 
            ? '✅ Sin venenos de cocina detectados' 
            : `⚠️ ${venenosDetectados.length} ingredientes problemáticos encontrados`,
        },

        // ✨ PILARES DE ALEGRÍA
        pilares: {
          presentes: pilaresPresentes,
          ausentes: pilaresAusentes,
          puntaje: ((4 - pilaresAusentes.length) / 4) * 10,
          interpretacion: pilaresAusentes.length === 0 
            ? '✅ Los 4 pilares presentes: alegría completa' 
            : `Faltan ${pilaresAusentes.length} pilar(es)`,
        },

        // 🔥 MADURACIÓN POR FUEGO
        maduracion: {
          porcentajeCocido,
          pesoCocido: pesoCocidoRequerido,
          pesoCrudo: pesoCrudoEncontrado,
          interpretacion: porcentajeCocido >= 85 
            ? '✅ Maduración adecuada por el fuego' 
            : `⚠️ Solo ${porcentajeCocido.toFixed(0)}% cocido (ideal >85%)`,
        },

        // 🔄 COMPENSACIÓN
        compensacion: {
          porcentaje: porcentajeCompensacion,
          interpretacion: porcentajeCompensacion >= 60 
            ? '✅ Buena alternancia seco/húmedo' 
            : `⚠️ Poca alternancia (${porcentajeCompensacion.toFixed(0)}%)`,
        },

        // 📋 RECOMENDACIONES
        recomendaciones,

        // 🎯 DIAGNÓSTICO FINAL
        diagnostico,
      },
    });
  } catch (error: any) {
    console.error('Error en análisis hildegardiano:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function obtenerRazonVeneno(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('frutilla') || n.includes('fresa') || n.includes('frambuesa') || n.includes('mora'))
    return 'Cargan la sangre de sustancias nocivas';
  if (n.includes('durazno') || n.includes('ciruela'))
    return 'Debilitan los órganos internos';
  if (n.includes('puerro'))
    return 'Generan humores nocivos';
  if (n.includes('papa') || n.includes('batata'))
    return 'Pesadas para el estómago (preferir espelta)';
  if (n.includes('tomate'))
    return 'Frías y húmedas en exceso';
  if (n.includes('champiñón') || n.includes('hongo') || n.includes('seta'))
    return 'Nacidas de la "espuma nociva", generan melancolía';
  if (n.includes('berenjena'))
    return 'Generan bilis negra y tristeza';
  return 'No recomendado por Hildegarda';
}

function obtenerPilar(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('espelta')) return 'Espelta';
  if (n.includes('hinojo')) return 'Hinojo';
  if (n.includes('galanga')) return 'Galanga';
  if (n.includes('castaña') || n.includes('castana')) return 'Castañas';
  return nombre;
}

function interpretarViriditas(puntaje: number): string {
  if (puntaje >= 8) return '🟢 Excelente vigor verde. El menú tiene alta vitalidad y sutileza medicinal.';
  if (puntaje >= 6) return '🟡 Buen vigor verde. El menú tiene vitalidad aceptable.';
  if (puntaje >= 4) return '🟠 Vigor verde moderado. Podría mejorar con ingredientes más sutiles.';
  return '🔴 Vigor verde bajo. El menú carece de fuerza vital. Revisar ingredientes.';
}

function interpretarEucrasia(puntaje: number): string {
  if (puntaje >= 8) return '⚖️ Eucrasia excelente. Los humores están en perfecta armonía.';
  if (puntaje >= 6) return '⚖️ Eucrasia aceptable. Hay balance pero puede refinarse.';
  if (puntaje >= 4) return '⚠️ Eucrasia comprometida. Desequilibrio entre calor/frío o seco/húmedo.';
  return '❌ Eucrasia deficiente. Desequilibrio marcado que requiere corrección.';
}

function generarDiagnostico(
  viriditas: number,
  eucrasia: number,
  venenos: number,
  porcentajeCocido: number,
  pilaresAusentes: number
): { nivel: string; mensaje: string; color: string } {
  const score = 
    (viriditas * 1.5) + 
    (eucrasia * 1.5) + 
    (venenos === 0 ? 10 : Math.max(0, 10 - venenos * 2)) +
    (porcentajeCocido >= 85 ? 10 : porcentajeCocido / 10) +
    ((4 - pilaresAusentes) * 2.5);
  
  const maxScore = 60;
  const porcentaje = (score / maxScore) * 100;

  if (porcentaje >= 85) {
    return {
      nivel: 'EXCELENTE',
      mensaje: 'Menú en plena armonía hildegardiana. Respeta la Subtilitat, la Eucrasia y la Viriditas. Es medicina pura.',
      color: 'green',
    };
  }
  if (porcentaje >= 70) {
    return {
      nivel: 'MUY BUENO',
      mensaje: 'Menú con sólida base hildegardiana. Pequeños ajustes lo llevarían a la perfección.',
      color: 'green',
    };
  }
  if (porcentaje >= 55) {
    return {
      nivel: 'ACEPTABLE',
      mensaje: 'Menú con buena intención pero requiere ajustes en venenos, cocción o pilares.',
      color: 'yellow',
    };
  }
  if (porcentaje >= 40) {
    return {
      nivel: 'NECESITA MEJORAS',
      mensaje: 'Menú con desbalances importantes. Revisar venenos de cocina y pilares ausentes.',
      color: 'orange',
    };
  }
  return {
    nivel: 'REQUIERE REVISIÓN',
    mensaje: 'Menú alejado de los principios hildegardianos. Necesita reformulación completa.',
    color: 'red',
  };
}

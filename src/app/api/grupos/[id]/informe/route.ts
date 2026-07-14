import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { normalizarAGramos, estimarPorciones } from '@/lib/analisis-plato';

// ============================================================
// Informe COMPLETO de un grupo: nutricional científico + hildegardiano
// Accesible para los miembros del grupo (ruta /api/grupos, no admin)
// ============================================================

const VDR = {
  calorias: 2000, proteinas: 50, carbohidratos: 275, grasas: 78,
  grasas_saturadas: 20, fibra: 25, azucar: 50, sodio: 2300, calcio: 1000,
  hierro: 18, magnesio: 400, potasio: 3500, zinc: 11, fosforo: 700,
  vitaminaA: 900, vitaminaC: 90, vitaminaD: 20, vitaminaE: 15, vitaminaK: 120,
  vitaminaB1: 1.2, vitaminaB2: 1.3, vitaminaB3: 16, vitaminaB5: 5, vitaminaB6: 1.3,
  vitaminaB9: 400, vitaminaB12: 2.4,
};

// Nutrientes cuyo VDR es un máximo recomendado (no un mínimo)
const NUTRIENTES_MAX = new Set(['grasas_saturadas', 'azucar', 'sodio']);

function obtenerRazonVeneno(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('frutilla') || n.includes('fresa') || n.includes('frambuesa') || n.includes('mora')) return 'Cargan la sangre de sustancias nocivas';
  if (n.includes('durazno') || n.includes('ciruela')) return 'Debilitan los órganos internos';
  if (n.includes('puerro')) return 'Generan humores nocivos';
  if (n.includes('papa') || n.includes('batata')) return 'Pesadas para el estómago (preferir espelta)';
  if (n.includes('tomate')) return 'Frías y húmedas en exceso';
  if (n.includes('champiñón') || n.includes('hongo') || n.includes('seta')) return 'Nacidas de la "espuma nociva", generan melancolía';
  if (n.includes('berenjena')) return 'Generan bilis negra y tristeza';
  return 'No recomendado por Hildegarda';
}

function obtenerPilar(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('espelta') || n.includes('farro')) return 'Espelta';
  if (n.includes('hinojo')) return 'Hinojo';
  if (n.includes('galanga')) return 'Galanga';
  if (n.includes('castaña') || n.includes('castana')) return 'Castañas';
  if (n.includes('almendra')) return 'Almendras';
  return nombre;
}

function interpretarViriditas(p: number): string {
  if (p >= 8) return '🟢 Excelente vigor verde. El menú tiene alta vitalidad y sutileza medicinal.';
  if (p >= 6) return '🟡 Buen vigor verde. El menú tiene vitalidad aceptable.';
  if (p >= 4) return '🟠 Vigor verde moderado. Podría mejorar con ingredientes más sutiles.';
  return '🔴 Vigor verde bajo. El menú carece de fuerza vital.';
}

function interpretarEucrasia(p: number): string {
  if (p >= 8) return '⚖️ Eucrasia excelente. Los humores están en perfecta armonía.';
  if (p >= 6) return '⚖️ Eucrasia aceptable. Hay balance pero puede refinarse.';
  if (p >= 4) return '⚠️ Eucrasia comprometida. Desequilibrio entre calor/frío o seco/húmedo.';
  return '❌ Eucrasia deficiente. Requiere corrección.';
}

function generarDiagnostico(viriditas: number, eucrasia: number, venenos: number, porcentajeCocido: number, pilaresAusentes: number) {
  const score =
    viriditas * 1.5 + eucrasia * 1.5 +
    (venenos === 0 ? 10 : Math.max(0, 10 - venenos * 2)) +
    (porcentajeCocido >= 85 ? 10 : porcentajeCocido / 10) +
    (4 - pilaresAusentes) * 2.5;
  const porcentaje = (score / 60) * 100;
  if (porcentaje >= 85) return { nivel: 'EXCELENTE', mensaje: 'Menú en plena armonía hildegardiana. Es medicina pura.', color: 'green' };
  if (porcentaje >= 70) return { nivel: 'MUY BUENO', mensaje: 'Menú con sólida base hildegardiana. Pequeños ajustes lo llevarían a la perfección.', color: 'green' };
  if (porcentaje >= 55) return { nivel: 'ACEPTABLE', mensaje: 'Menú con buena intención pero requiere ajustes en venenos, cocción o pilares.', color: 'yellow' };
  if (porcentaje >= 40) return { nivel: 'NECESITA MEJORAS', mensaje: 'Menú con desbalances importantes.', color: 'orange' };
  return { nivel: 'REQUIERE REVISIÓN', mensaje: 'Menú alejado de los principios hildegardianos.', color: 'red' };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    // Grupo + items
    const { data: grupo } = await supabase
      .from('grupos_pedido')
      .select('id, fecha_inicio, fecha_fin')
      .eq('id', params.id)
      .single();

    if (!grupo) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    const { data: items } = await supabase
      .from('grupo_items')
      .select('id, fecha, tipo_comida, cantidad, plato_id')
      .eq('grupo_id', params.id);

    if (!items || items.length === 0) {
      return NextResponse.json({ vacio: true, nutricional: null, hildegardiano: null });
    }

    const fechaInicio = grupo.fecha_inicio;
    const fechaFin = grupo.fecha_fin;
    const platoIds = [...new Set(items.map((i) => i.plato_id).filter(Boolean))];

    // Recetas
    const { data: recetasReales } = await supabase
      .from('recetas')
      .select('id, plato_id, porciones')
      .in('plato_id', platoIds.length ? platoIds : ['00000000-0000-0000-0000-000000000000']);

    const recetaPorPlato = new Map<string, { id: string; porciones: number }>();
    (recetasReales || []).forEach((r: any) => recetaPorPlato.set(r.plato_id, { id: r.id, porciones: r.porciones || 1 }));
    const recetaIds = Array.from(recetaPorPlato.values()).map((r) => r.id);

    // Ingredientes (nutrición + hildegardiano)
    const { data: recetaIngredientes } = await supabase
      .from('receta_ingredientes')
      .select(`
        receta_id, cantidad, unidad,
        ingrediente:ingredientes(
          id, nombre, categoria, temperamento,
          es_veneno_hildegardiano, es_base_alegria, nivel_subtilitat, requiere_coccion, propiedades_hildegardianas,
          calorias, proteinas_g, carbohidratos_g, grasas_g, grasas_saturadas_g, fibra_g, azucar_g,
          sodio_mg, calcio_mg, hierro_mg, magnesio_mg, potasio_mg, zinc_mg, fosforo_mg,
          vitamina_a_mcg, vitamina_c_mg, vitamina_d_mcg, vitamina_e_mg, vitamina_k_mcg,
          vitamina_b1_mg, vitamina_b2_mg, vitamina_b3_mg, vitamina_b5_mg, vitamina_b6_mg, vitamina_b9_mcg, vitamina_b12_mcg
        )
      `)
      .in('receta_id', recetaIds.length ? recetaIds : ['00000000-0000-0000-0000-000000000000']);

    // ===== NUTRICIONAL =====
    const total: any = {
      calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, grasas_saturadas: 0, fibra: 0, azucar: 0,
      sodio: 0, calcio: 0, hierro: 0, magnesio: 0, potasio: 0, zinc: 0, fosforo: 0,
      vitaminaA: 0, vitaminaC: 0, vitaminaD: 0, vitaminaE: 0, vitaminaK: 0,
      vitaminaB1: 0, vitaminaB2: 0, vitaminaB3: 0, vitaminaB5: 0, vitaminaB6: 0, vitaminaB9: 0, vitaminaB12: 0,
    };
    const porDia: Record<string, any> = {};

    // ===== HILDEGARDIANO acumuladores =====
    let pesoTotal = 0;
    let sumaSubtilitatPonderada = 0;
    let pesoCocidoRequerido = 0;
    let pesoCrudoEncontrado = 0;
    const venenosDetectados: Array<{ nombre: string; peso: number; razon: string }> = [];
    const basesAlegriaEncontradas = new Set<string>();
    const temperamentos: Record<string, number> = {
      calido: 0, calido_seco: 0, calido_humedo: 0, frio: 0, frio_seco: 0, frio_humedo: 0,
    };
    const ingredientesPorDia: Record<string, Array<{ seco: boolean; nombre: string }>> = {};

    // Peso total por receta, para estimar porciones confiables por plato.
    const pesoTotalPorReceta = new Map<string, number>();
    (recetaIngredientes || []).forEach((ri: any) => {
      const g = ri.ingrediente ? normalizarAGramos(ri.cantidad, ri.unidad) : 0;
      pesoTotalPorReceta.set(ri.receta_id, (pesoTotalPorReceta.get(ri.receta_id) || 0) + g);
    });

    items.forEach((item) => {
      const receta = recetaPorPlato.get(item.plato_id);
      if (!receta) return;
      const porcionesEfectivas = estimarPorciones(pesoTotalPorReceta.get(receta.id) || 0, receta.porciones);
      const factorEscala = (item.cantidad || 1) / porcionesEfectivas;

      (recetaIngredientes || [])
        .filter((ri: any) => ri.receta_id === receta.id)
        .forEach((ri: any) => {
          const ing = ri.ingrediente;
          if (!ing) return;

          const gramosEscala = normalizarAGramos(ri.cantidad, ri.unidad) * factorEscala;
          const factor = gramosEscala / 100;

          // Nutrición
          total.calorias += (ing.calorias || 0) * factor;
          total.proteinas += (ing.proteinas_g || 0) * factor;
          total.carbohidratos += (ing.carbohidratos_g || 0) * factor;
          total.grasas += (ing.grasas_g || 0) * factor;
          total.grasas_saturadas += (ing.grasas_saturadas_g || 0) * factor;
          total.fibra += (ing.fibra_g || 0) * factor;
          total.azucar += (ing.azucar_g || 0) * factor;
          total.sodio += (ing.sodio_mg || 0) * factor;
          total.calcio += (ing.calcio_mg || 0) * factor;
          total.hierro += (ing.hierro_mg || 0) * factor;
          total.magnesio += (ing.magnesio_mg || 0) * factor;
          total.potasio += (ing.potasio_mg || 0) * factor;
          total.zinc += (ing.zinc_mg || 0) * factor;
          total.fosforo += (ing.fosforo_mg || 0) * factor;
          total.vitaminaA += (ing.vitamina_a_mcg || 0) * factor;
          total.vitaminaC += (ing.vitamina_c_mg || 0) * factor;
          total.vitaminaD += (ing.vitamina_d_mcg || 0) * factor;
          total.vitaminaE += (ing.vitamina_e_mg || 0) * factor;
          total.vitaminaK += (ing.vitamina_k_mcg || 0) * factor;
          total.vitaminaB1 += (ing.vitamina_b1_mg || 0) * factor;
          total.vitaminaB2 += (ing.vitamina_b2_mg || 0) * factor;
          total.vitaminaB3 += (ing.vitamina_b3_mg || 0) * factor;
          total.vitaminaB5 += (ing.vitamina_b5_mg || 0) * factor;
          total.vitaminaB6 += (ing.vitamina_b6_mg || 0) * factor;
          total.vitaminaB9 += (ing.vitamina_b9_mcg || 0) * factor;
          total.vitaminaB12 += (ing.vitamina_b12_mcg || 0) * factor;

          if (!porDia[item.fecha]) porDia[item.fecha] = { calorias: 0, platos: 0 };
          porDia[item.fecha].calorias += (ing.calorias || 0) * factor;

          // Hildegardiano
          pesoTotal += gramosEscala;
          sumaSubtilitatPonderada += (ing.nivel_subtilitat || 5) * gramosEscala;
          if (ing.temperamento && temperamentos[ing.temperamento] !== undefined) {
            temperamentos[ing.temperamento] += gramosEscala;
          }

          // Clasificación hildegardiana según los flags REALES de la BD (no por nombre)
          if (ing.es_veneno_hildegardiano) {
            venenosDetectados.push({
              nombre: ing.nombre,
              peso: gramosEscala,
              razon: ing.propiedades_hildegardianas || obtenerRazonVeneno(ing.nombre),
            });
          }
          if (ing.es_base_alegria) basesAlegriaEncontradas.add(obtenerPilar(ing.nombre));
          if (ing.requiere_coccion) pesoCocidoRequerido += gramosEscala;
          else pesoCrudoEncontrado += gramosEscala;
          if (!ingredientesPorDia[item.fecha]) ingredientesPorDia[item.fecha] = [];
          ingredientesPorDia[item.fecha].push({ seco: ing.temperamento?.includes('seco') || false, nombre: ing.nombre });
        });

      if (porDia[item.fecha]) porDia[item.fecha].platos += 1;
    });

    // Nutricional: promedio + %VDR + alertas
    const diasConDatos = Object.keys(porDia).length;
    const diasTotalesEnRango = Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diasSinDatos = Math.max(0, diasTotalesEnRango - diasConDatos);

    const prom: any = {};
    Object.keys(total).forEach((k) => (prom[k] = diasConDatos > 0 ? total[k] / diasConDatos : 0));

    const pv: any = {};
    const vdrKeys: Record<string, number> = {
      calorias: VDR.calorias, proteinas: VDR.proteinas, carbohidratos: VDR.carbohidratos, grasas: VDR.grasas,
      grasas_saturadas: VDR.grasas_saturadas, fibra: VDR.fibra, azucar: VDR.azucar, sodio: VDR.sodio,
      calcio: VDR.calcio, hierro: VDR.hierro, magnesio: VDR.magnesio, potasio: VDR.potasio, zinc: VDR.zinc, fosforo: VDR.fosforo,
      vitaminaA: VDR.vitaminaA, vitaminaC: VDR.vitaminaC, vitaminaD: VDR.vitaminaD, vitaminaE: VDR.vitaminaE, vitaminaK: VDR.vitaminaK,
      vitaminaB1: VDR.vitaminaB1, vitaminaB2: VDR.vitaminaB2, vitaminaB3: VDR.vitaminaB3, vitaminaB5: VDR.vitaminaB5,
      vitaminaB6: VDR.vitaminaB6, vitaminaB9: VDR.vitaminaB9, vitaminaB12: VDR.vitaminaB12,
    };
    Object.entries(vdrKeys).forEach(([k, v]) => (pv[k] = v ? (prom[k] / v) * 100 : 0));

    const alertas: Array<{ tipo: string; icono: string; mensaje: string }> = [];
    if (diasSinDatos > 0) alertas.push({ tipo: 'info', icono: '📅', mensaje: `${diasSinDatos} día(s) sin platos (no incluidos en el promedio)` });
    if (diasConDatos > 0) {
      // Déficits (mínimos)
      if (pv.calorias < 80) alertas.push({ tipo: 'deficit', icono: '⚠️', mensaje: `Bajo en calorías (${prom.calorias.toFixed(0)} kcal/día, ${pv.calorias.toFixed(0)}% VDR)` });
      if (pv.proteinas < 80) alertas.push({ tipo: 'deficit', icono: '💪', mensaje: `Bajo en proteínas (${prom.proteinas.toFixed(1)} g/día, ${pv.proteinas.toFixed(0)}% VDR)` });
      if (pv.fibra < 80) alertas.push({ tipo: 'deficit', icono: '🌾', mensaje: `Bajo en fibra (${prom.fibra.toFixed(1)} g/día, ${pv.fibra.toFixed(0)}% VDR)` });
      if (pv.calcio < 80) alertas.push({ tipo: 'deficit', icono: '🦴', mensaje: `Bajo en calcio (${prom.calcio.toFixed(0)} mg/día, ${pv.calcio.toFixed(0)}% VDR)` });
      if (pv.hierro < 80) alertas.push({ tipo: 'deficit', icono: '🩸', mensaje: `Bajo en hierro (${prom.hierro.toFixed(1)} mg/día, ${pv.hierro.toFixed(0)}% VDR)` });
      if (pv.magnesio < 80) alertas.push({ tipo: 'deficit', icono: '🧲', mensaje: `Bajo en magnesio (${prom.magnesio.toFixed(0)} mg/día, ${pv.magnesio.toFixed(0)}% VDR)` });
      if (pv.potasio < 80) alertas.push({ tipo: 'deficit', icono: '🍌', mensaje: `Bajo en potasio (${prom.potasio.toFixed(0)} mg/día, ${pv.potasio.toFixed(0)}% VDR)` });
      if (pv.zinc < 80) alertas.push({ tipo: 'deficit', icono: '⚙️', mensaje: `Bajo en zinc (${prom.zinc.toFixed(1)} mg/día, ${pv.zinc.toFixed(0)}% VDR)` });
      if (pv.vitaminaA < 80) alertas.push({ tipo: 'deficit', icono: '🥕', mensaje: `Bajo en vitamina A (${prom.vitaminaA.toFixed(0)} mcg/día, ${pv.vitaminaA.toFixed(0)}% VDR)` });
      if (pv.vitaminaC < 80) alertas.push({ tipo: 'deficit', icono: '🍊', mensaje: `Bajo en vitamina C (${prom.vitaminaC.toFixed(1)} mg/día, ${pv.vitaminaC.toFixed(0)}% VDR)` });
      if (pv.vitaminaD < 80) alertas.push({ tipo: 'deficit', icono: '☀️', mensaje: `Bajo en vitamina D (${prom.vitaminaD.toFixed(1)} mcg/día, ${pv.vitaminaD.toFixed(0)}% VDR)` });
      if (pv.vitaminaB9 < 80) alertas.push({ tipo: 'deficit', icono: '🥬', mensaje: `Bajo en folato/B9 (${prom.vitaminaB9.toFixed(0)} mcg/día, ${pv.vitaminaB9.toFixed(0)}% VDR)` });
      // Excesos (máximos)
      if (pv.calorias > 120) alertas.push({ tipo: 'exceso', icono: '🔥', mensaje: `Alto en calorías (${prom.calorias.toFixed(0)} kcal/día, ${pv.calorias.toFixed(0)}% VDR)` });
      if (pv.sodio > 100) alertas.push({ tipo: 'exceso', icono: '🧂', mensaje: `Alto en sodio (${prom.sodio.toFixed(0)} mg/día, ${pv.sodio.toFixed(0)}% del máx)` });
      if (pv.grasas_saturadas > 100) alertas.push({ tipo: 'exceso', icono: '🧈', mensaje: `Alto en grasas saturadas (${prom.grasas_saturadas.toFixed(1)} g/día, ${pv.grasas_saturadas.toFixed(0)}% del máx)` });
      if (pv.azucar > 100) alertas.push({ tipo: 'exceso', icono: '🍬', mensaje: `Alto en azúcar (${prom.azucar.toFixed(1)} g/día, ${pv.azucar.toFixed(0)}% del máx)` });
    }
    if (alertas.length === 0) alertas.push({ tipo: 'info', icono: '✅', mensaje: 'El menú está balanceado nutricionalmente' });

    // Hildegardiano: índices
    const viriditas = pesoTotal > 0 ? sumaSubtilitatPonderada / pesoTotal : 0;
    const totalCalido = temperamentos.calido + temperamentos.calido_seco + temperamentos.calido_humedo;
    const totalFrio = temperamentos.frio + temperamentos.frio_seco + temperamentos.frio_humedo;
    const totalSeco = temperamentos.calido_seco + temperamentos.frio_seco;
    const totalHumedo = temperamentos.calido_humedo + temperamentos.frio_humedo;
    const totalTemp = totalCalido + totalFrio;
    const pCalido = totalTemp > 0 ? (totalCalido / totalTemp) * 100 : 0;
    const pFrio = totalTemp > 0 ? (totalFrio / totalTemp) * 100 : 0;
    const pSeco = totalTemp > 0 ? (totalSeco / totalTemp) * 100 : 0;
    const pHumedo = totalTemp > 0 ? (totalHumedo / totalTemp) * 100 : 0;
    const eucrasiaCalor = pCalido >= 40 && pCalido <= 60 ? 10 : pCalido >= 30 && pCalido <= 70 ? 7 : 4;
    const eucrasiaHumedad = pSeco >= 30 && pSeco <= 70 ? 10 : pSeco >= 20 && pSeco <= 80 ? 7 : 4;
    const eucrasia = (eucrasiaCalor + eucrasiaHumedad) / 2;
    const pesoTotalIng = pesoCocidoRequerido + pesoCrudoEncontrado;
    const porcentajeCocido = pesoTotalIng > 0 ? (pesoCocidoRequerido / pesoTotalIng) * 100 : 0;
    const pilaresEsperados = ['Espelta', 'Hinojo', 'Galanga', 'Castañas'];
    const pilaresPresentes = Array.from(basesAlegriaEncontradas);
    const pilaresAusentes = pilaresEsperados.filter((p) => !pilaresPresentes.includes(p));

    let transBuenas = 0;
    let transTot = 0;
    Object.values(ingredientesPorDia).forEach((dia) => {
      for (let i = 1; i < dia.length; i++) {
        transTot++;
        if (dia[i].seco !== dia[i - 1].seco) transBuenas++;
      }
    });
    const porcentajeCompensacion = transTot > 0 ? (transBuenas / transTot) * 100 : 0;

    const recomendaciones: string[] = [];
    if (venenosDetectados.length > 0) {
      const vu = [...new Set(venenosDetectados.map((v) => v.nombre))];
      recomendaciones.push(`🚫 Eliminar venenos de cocina: ${vu.join(', ')}. Hildegarda dice: "cargan la sangre de sustancias nocivas".`);
    }
    if (pilaresAusentes.length > 0) recomendaciones.push(`✨ Agregar pilares ausentes: ${pilaresAusentes.join(', ')}. Son la base de la alegría del alma.`);
    if (porcentajeCocido < 85) recomendaciones.push(`🔥 Aumentar cocción al 85%+. Actualmente ${porcentajeCocido.toFixed(0)}%. Hildegarda: "casi todo debe pasar por el fuego para que los jugos maduren".`);
    if (pCalido > 65) recomendaciones.push(`💧 Menú muy cálido (${pCalido.toFixed(0)}%). Agregar ingredientes fríos para templar el exceso de ardor.`);
    else if (pCalido < 35) recomendaciones.push(`🔥 Menú muy frío (${pFrio.toFixed(0)}%). Agregar ingredientes cálidos para proteger el corazón.`);
    if (pHumedo > 70) recomendaciones.push(`🍃 Exceso de humedad (${pHumedo.toFixed(0)}%). Agregar ingredientes secos.`);
    if (!basesAlegriaEncontradas.has('Espelta')) recomendaciones.push(`🌾 La espelta debe ser el carbohidrato dominante.`);
    if (porcentajeCompensacion < 50) recomendaciones.push(`🔄 Mejorar secuencia compensatoria. Después de un alimento seco, seguir con uno húmedo.`);
    if (recomendaciones.length === 0) recomendaciones.push(`✅ Menú en excelente armonía con los principios hildegardianos.`);

    const diagnostico = generarDiagnostico(viriditas, eucrasia, venenosDetectados.length, porcentajeCocido, pilaresAusentes.length);

    return NextResponse.json({
      vacio: false,
      nutricional: {
        promedioDiario: diasConDatos > 0 ? prom : null,
        porcentajeVDR: pv,
        vdr: VDR,
        alertas,
        diasConDatos,
        diasSinDatos,
        diasTotalesEnRango,
      },
      hildegardiano: {
        diasAnalizados: Object.keys(ingredientesPorDia).length,
        viriditas: { puntaje: viriditas, interpretacion: interpretarViriditas(viriditas) },
        eucrasia: { puntaje: eucrasia, calido: pCalido, frio: pFrio, seco: pSeco, humedo: pHumedo, interpretacion: interpretarEucrasia(eucrasia) },
        venenos: {
          cantidad: venenosDetectados.length,
          lista: venenosDetectados,
          interpretacion: venenosDetectados.length === 0 ? '✅ Sin venenos de cocina detectados' : `⚠️ ${venenosDetectados.length} ingredientes problemáticos encontrados`,
        },
        pilares: {
          presentes: pilaresPresentes,
          ausentes: pilaresAusentes,
          puntaje: ((4 - pilaresAusentes.length) / 4) * 10,
          interpretacion: pilaresAusentes.length === 0 ? '✅ Los 4 pilares presentes: alegría completa' : `Faltan ${pilaresAusentes.length} pilar(es)`,
        },
        maduracion: {
          porcentajeCocido,
          interpretacion: porcentajeCocido >= 85 ? '✅ Maduración adecuada por el fuego' : `⚠️ Solo ${porcentajeCocido.toFixed(0)}% cocido (ideal >85%)`,
        },
        compensacion: {
          porcentaje: porcentajeCompensacion,
          interpretacion: porcentajeCompensacion >= 60 ? '✅ Buena alternancia seco/húmedo' : `⚠️ Poca alternancia (${porcentajeCompensacion.toFixed(0)}%)`,
        },
        recomendaciones,
        diagnostico,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

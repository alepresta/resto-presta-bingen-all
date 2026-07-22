// ============================================================
// Motor de INFORME DUAL (científico + hildegardiano).
// Problema 1 del plan: salida estandarizada, explicable y
// aprovechando el 100% de los datos de `ingredientes`.
//
// Consume filas reales de la BD (receta + receta_ingredientes +
// ingredientes) y produce el DTO `InformeDual` para API/UI/export.
// ============================================================
import {
  VDR,
  normalizarAGramos,
  evaluarHildegardianoDB,
  type IngredienteNutricion,
} from './analisis-plato';
import {
  escalarIngrediente,
  factorEscala,
  PORCIONES_BASE_DEFAULT,
  type CategoriaEscalado,
} from './escalado';

export type MetodoCoccion = 'hervido' | 'horneado' | 'salteado' | 'crudo' | 'vapor';
export type SelloViriditas = 'maximo' | 'alto' | 'moderado' | 'bajo' | 'nulo';
export type Recomendacion =
  | 'muy_recomendado'
  | 'recomendado'
  | 'neutral'
  | 'mejorar'
  | 'rechazado';
export type Estacion = 'primavera' | 'verano' | 'otono' | 'invierno';

// ---- Entrada del motor -------------------------------------------------

/** Fila de ingrediente con TODOS los campos hildegardianos + nutrición. */
export interface IngredienteInforme extends IngredienteNutricion {
  id?: string;
  categoria_escalado?: CategoriaEscalado | null;
  factor_rendimiento_coccion?: number | null;
  impacto_livor?: string | null;
  impacto_bilis_negra?: string | null;
  viriditas_index?: SelloViriditas | string | null;
  humor_principal?: string | null;
  beneficios_hildegardianos?: string | null;
  contraindicaciones?: string | null;
  estacion_ideal?: string | null;
  frecuencia_recomendada?: string | null;
  apto_para_enfermos?: boolean | null;
  alergenos?: string[] | null;
}

export interface RecetaIngredienteInforme {
  cantidad: number;
  unidad: string;
  ingrediente: IngredienteInforme | null;
}

export interface RecetaInforme {
  nombre?: string;
  porciones_base?: number | null;
  peso_crudo_total_g?: number | null;
  peso_cocido_total_g?: number | null;
  metodo_coccion_principal?: MetodoCoccion | string | null;
  ingredientes: RecetaIngredienteInforme[];
}

// ---- DTO de salida -----------------------------------------------------

export interface InformeDual {
  resumen: {
    caloriasPorPorcion: number;
    proteinasPorPorcion: number;
    carbohidratosPorPorcion: number;
    grasasPorPorcion: number;
    porcionesBase: number;
    porcionesObjetivo: number;
    recomendacion: Recomendacion;
    puntajeGlobal: number;
    selloViriditas: SelloViriditas;
    esAptoParaEnfermos: boolean;
  };
  cientifico: {
    totalesReceta: {
      calorias: number;
      proteinas_g: number;
      carbohidratos_g: number;
      grasas_g: number;
      fibra_g: number;
    };
    porcion: {
      calorias: number;
      proteinas_g: number;
      carbohidratos_g: number;
      grasas_g: number;
      fibra_g: number;
    };
    micronutrientesDestacados: string[];
    pesoCrudoTotal_g: number;
    pesoCocidoEstimado_g: number;
    factorRendimientoPromedio: number;
  };
  hildegardiano: {
    puntajeFinal: number;
    temperamentoDominante: string;
    impactoLivor: 'limpia' | 'neutro' | 'genera';
    impactoBilisNegra: 'reduce' | 'neutro' | 'aumenta';
    factores: Array<{
      codigo: string;
      etiqueta: string;
      tipo: 'bonificacion' | 'penalizacion';
      puntos: number;
      motivo: string;
    }>;
    ingredientesDestacados: Array<{
      nombre: string;
      rol: 'pilar' | 'medicina' | 'base_alegria' | 'precaucion';
      subtilitat: number;
      viriditas: string;
      mensaje: string;
    }>;
  };
  detalleIngredientes: Array<{
    nombre: string;
    cantidadEscalada: string;
    temperamento: string;
    subtilitat: number;
    viriditas: string;
    esVeneno: boolean;
    esBaseAlegria: boolean;
    requiereCoccion: boolean;
    estaCocido: boolean;
    aptoParaEnfermos: boolean;
    frecuenciaRecomendada: string;
    estacionIdeal: string;
    enTemporada: boolean;
    impactoLivor: string;
    impactoBilisNegra: string;
    humorPrincipal: string;
    beneficios: string;
    propiedades: string;
    contraindicaciones: string;
    alternativaSana: string | null;
  }>;
  confianza: {
    nivel: 'alta' | 'media' | 'baja';
    score: number;
    motivos: string[];
    usaPesoCocidoEstimado: boolean;
  };
  alergenos: {
    presentes: string[];
    porIngrediente: Record<string, string[]>;
    puedeTrazas: boolean;
    nivelRiesgo: 'ninguno' | 'bajo' | 'medio' | 'alto';
  };
  metodoCoccion: {
    principal: MetodoCoccion;
    impactoPuntaje: number;
  };
  advertenciasCoccion: string[];
  maridajeHildegardiano: {
    bebidaRecomendada: string;
    especiasSugeridas: string[];
    postreIdeal: string;
  };
  alternativasSanas: Array<{
    ingredienteOriginal: string;
    problema: string;
    alternativa: string;
    motivo: string;
  }>;
  recomendaciones: {
    preparacion: string[];
    consumo: string[];
    maridaje: string[];
    contraindicaciones: string[];
  };
  estacionalidad: {
    estacionActual: Estacion;
    ingredientesEnTemporada: string[];
    ingredientesFueraTemporada: string[];
    porcentajeTemporada: number;
  };
}

// ---- Helpers -----------------------------------------------------------

const ALERGENOS_MAYORES = ['gluten', 'frutos_secos', 'mani', 'mariscos', 'pescado'];

/** Mapea el índice categórico de viriditas a un valor numérico 0-10. */
export function viriditasANumero(v?: string | null): number {
  switch ((v || '').toLowerCase()) {
    case 'maximo':
      return 9;
    case 'alto':
      return 7;
    case 'moderado':
      return 5;
    case 'bajo':
      return 3;
    case 'nulo':
      return 1;
    default:
      return 5;
  }
}

/** Mapea un promedio numérico de viriditas al sello categórico global. */
export function selloDesdePromedio(promedio: number): SelloViriditas {
  if (promedio >= 9) return 'maximo';
  if (promedio >= 7) return 'alto';
  if (promedio >= 5) return 'moderado';
  if (promedio >= 3) return 'bajo';
  return 'nulo';
}

/** Estación actual del hemisferio sur (Argentina). */
export function estacionActual(fecha: Date = new Date()): Estacion {
  const m = fecha.getMonth(); // 0=enero
  if (m === 11 || m === 0 || m === 1) return 'verano';
  if (m >= 2 && m <= 4) return 'otono';
  if (m >= 5 && m <= 7) return 'invierno';
  return 'primavera';
}

/** Normaliza el nombre de estación de la BD ('otonio' -> 'otono'). */
function normalizarEstacion(e?: string | null): string {
  const v = (e || '').toLowerCase();
  if (v === 'otonio') return 'otono';
  return v;
}

function estaEnTemporada(estacionIdeal: string | null | undefined, actual: Estacion): boolean {
  const e = normalizarEstacion(estacionIdeal);
  if (!e || e === 'ninguna') return false;
  if (e === 'todas') return true;
  return e === actual;
}

/** Impacto del método de cocción sobre el puntaje hildegardiano. */
export function impactoMetodoCoccion(
  metodo: MetodoCoccion,
  requiereCoccionAlguno: boolean
): number {
  switch (metodo) {
    case 'hervido':
    case 'vapor':
      return 5;
    case 'horneado':
      return 0;
    case 'salteado':
      return -10;
    case 'crudo':
      return requiereCoccionAlguno ? -20 : 0;
    default:
      return 0;
  }
}

function factorRendimiento(ing: IngredienteInforme): number {
  const f = ing.factor_rendimiento_coccion;
  if (typeof f === 'number' && Number.isFinite(f) && f > 0) return f;
  return 1;
}

function moda(valores: string[]): string {
  const conteo = new Map<string, number>();
  valores.filter(Boolean).forEach((v) => conteo.set(v, (conteo.get(v) || 0) + 1));
  let mejor = '';
  let max = 0;
  conteo.forEach((n, v) => {
    if (n > max) {
      max = n;
      mejor = v;
    }
  });
  return mejor;
}

function redondear(n: number, dec = 1): number {
  const f = Math.pow(10, dec);
  return Math.round((Number.isFinite(n) ? n : 0) * f) / f;
}

// ---- Motor principal ---------------------------------------------------

/**
 * Construye el informe dual completo para una receta escalada a
 * `porcionesObjetivo` comensales.
 */
export function construirInformeDual(
  receta: RecetaInforme,
  porcionesObjetivo: number,
  fecha: Date = new Date()
): InformeDual {
  const porcionesBase =
    receta.porciones_base && receta.porciones_base > 0
      ? receta.porciones_base
      : PORCIONES_BASE_DEFAULT;
  const objetivo = porcionesObjetivo > 0 ? porcionesObjetivo : porcionesBase;
  const factor = factorEscala(objetivo, porcionesBase);
  const estacion = estacionActual(fecha);
  const metodo = (receta.metodo_coccion_principal as MetodoCoccion) || 'horneado';

  const ingredientesValidos = (receta.ingredientes || []).filter((ri) => ri.ingrediente);

  // 1) Escalado + totales nutricionales de la receta COMPLETA (a porciones objetivo).
  const totales = {
    calorias: 0,
    proteinas_g: 0,
    carbohidratos_g: 0,
    grasas_g: 0,
    fibra_g: 0,
  };
  const micros: Record<string, number> = {};
  let pesoCrudoTotal = 0;
  let pesoCocidoTotal = 0;
  let sumaFactorRendimiento = 0;
  let cuentaConCoccion = 0;

  const itemsHildegarda: Array<{ ing: IngredienteInforme; gramos: number }> = [];
  const detalleIngredientes: InformeDual['detalleIngredientes'] = [];
  const alergenosPresentes = new Set<string>();
  const alergenosPorIngrediente: Record<string, string[]> = {};
  const enTemporada: string[] = [];
  const fueraTemporada: string[] = [];
  const alternativasSanas: InformeDual['alternativasSanas'] = [];
  let ingredientesConEstacion = 0;

  ingredientesValidos.forEach((ri) => {
    const ing = ri.ingrediente as IngredienteInforme;
    const categoria = (ing.categoria_escalado as CategoriaEscalado) || 'lineal';

    // Escalado de la cantidad de este ingrediente.
    const esc = escalarIngrediente({
      cantidadBase: ri.cantidad,
      unidad: ri.unidad,
      porcionesObjetivo: objetivo,
      porcionesBase,
      categoria,
    });

    const gramosCrudos = normalizarAGramos(esc.cantidadCalculada, ri.unidad);
    const rend = factorRendimiento(ing);
    pesoCrudoTotal += gramosCrudos;
    pesoCocidoTotal += gramosCrudos * rend;
    sumaFactorRendimiento += rend;
    if (ing.requiere_coccion) cuentaConCoccion += 1;

    const f = gramosCrudos / 100; // valores por 100 g

    // Coherencia de subnutrientes.
    const grasas = Math.max(0, ing.grasas_g || 0);
    const carbohidratos = Math.max(0, ing.carbohidratos_g || 0);
    const fibra = Math.min(Math.max(0, ing.fibra_g || 0), carbohidratos);

    totales.calorias += (ing.calorias || 0) * f;
    totales.proteinas_g += (ing.proteinas_g || 0) * f;
    totales.carbohidratos_g += carbohidratos * f;
    totales.grasas_g += grasas * f;
    totales.fibra_g += fibra * f;

    // Micronutrientes destacados (acumulados para % VDR).
    micros.calcio = (micros.calcio || 0) + (ing.calcio_mg || 0) * f;
    micros.hierro = (micros.hierro || 0) + (ing.hierro_mg || 0) * f;
    micros.magnesio = (micros.magnesio || 0) + (ing.magnesio_mg || 0) * f;
    micros.potasio = (micros.potasio || 0) + (ing.potasio_mg || 0) * f;
    micros.zinc = (micros.zinc || 0) + (ing.zinc_mg || 0) * f;
    micros.vitaminaC = (micros.vitaminaC || 0) + (ing.vitamina_c_mg || 0) * f;
    micros.vitaminaA = (micros.vitaminaA || 0) + (ing.vitamina_a_mcg || 0) * f;

    // Peso por porción para la evaluación hildegardiana ponderada.
    itemsHildegarda.push({ ing, gramos: gramosCrudos / objetivo });

    // Alérgenos.
    const alergenosIng = (ing.alergenos || []).filter(Boolean);
    if (alergenosIng.length > 0) {
      alergenosPorIngrediente[ing.nombre] = alergenosIng;
      alergenosIng.forEach((a) => alergenosPresentes.add(a));
    }

    // Estacionalidad.
    const est = normalizarEstacion(ing.estacion_ideal);
    if (est && est !== 'ninguna') {
      ingredientesConEstacion += 1;
      if (estaEnTemporada(ing.estacion_ideal, estacion)) enTemporada.push(ing.nombre);
      else fueraTemporada.push(ing.nombre);
    }

    // Alternativa sana para venenos/precauciones.
    if (ing.es_veneno_hildegardiano) {
      alternativasSanas.push({
        ingredienteOriginal: ing.nombre,
        problema: ing.propiedades_hildegardianas || 'Marcado como veneno de cocina.',
        alternativa: sugerirAlternativa(ing),
        motivo: 'Sustituir para no cargar la sangre de humores nocivos.',
      });
    }

    // Detalle completo del ingrediente (aprovecha el 100% de la BD).
    const requiereCoccion = !!ing.requiere_coccion;
    const estaCocido = requiereCoccion ? metodo !== 'crudo' : true;
    detalleIngredientes.push({
      nombre: ing.nombre,
      cantidadEscalada: esc.textoMostrado,
      temperamento: ing.temperamento || 'neutro',
      subtilitat: ing.nivel_subtilitat ?? 5,
      viriditas: (ing.viriditas_index as string) || 'moderado',
      esVeneno: !!ing.es_veneno_hildegardiano,
      esBaseAlegria: !!ing.es_base_alegria,
      requiereCoccion,
      estaCocido,
      aptoParaEnfermos: ing.apto_para_enfermos !== false,
      frecuenciaRecomendada: ing.frecuencia_recomendada || 'ocasional',
      estacionIdeal: normalizarEstacion(ing.estacion_ideal) || 'todas',
      enTemporada: estaEnTemporada(ing.estacion_ideal, estacion),
      impactoLivor: ing.impacto_livor || 'neutro',
      impactoBilisNegra: ing.impacto_bilis_negra || 'neutro',
      humorPrincipal: ing.humor_principal || 'no especificado',
      beneficios: ing.beneficios_hildegardianos || '',
      propiedades: ing.propiedades_hildegardianas || '',
      contraindicaciones: ing.contraindicaciones || '',
      alternativaSana: ing.es_veneno_hildegardiano ? sugerirAlternativa(ing) : null,
    });
  });

  const factorRendimientoPromedio =
    ingredientesValidos.length > 0 ? sumaFactorRendimiento / ingredientesValidos.length : 1;

  // Peso cocido: usa el real si viene cargado, si no el estimado.
  const usaPesoCocidoEstimado = !receta.peso_cocido_total_g;
  const pesoCocidoEstimado = receta.peso_cocido_total_g || pesoCocidoTotal;

  // 2) Nutrición por porción.
  const porcion = {
    calorias: totales.calorias / objetivo,
    proteinas_g: totales.proteinas_g / objetivo,
    carbohidratos_g: totales.carbohidratos_g / objetivo,
    grasas_g: totales.grasas_g / objetivo,
    fibra_g: totales.fibra_g / objetivo,
  };

  // 2b) Totales de la RECETA COMPLETA (a sus porciones base), invariantes a la
  //     porción que se esté viendo. Así "receta completa" no se confunde con
  //     el valor "por porción" cuando se mira para 1 comensal.
  const totalesCompletos = {
    calorias: porcion.calorias * porcionesBase,
    proteinas_g: porcion.proteinas_g * porcionesBase,
    carbohidratos_g: porcion.carbohidratos_g * porcionesBase,
    grasas_g: porcion.grasas_g * porcionesBase,
    fibra_g: porcion.fibra_g * porcionesBase,
  };
  const factorACompleto = objetivo > 0 ? porcionesBase / objetivo : 1;
  const pesoCrudoCompleto = pesoCrudoTotal * factorACompleto;
  const pesoCocidoCompleto = usaPesoCocidoEstimado
    ? pesoCocidoTotal * factorACompleto
    : pesoCocidoEstimado;

  // Micronutrientes destacados: los que superan 20% del VDR por porción.
  const micronutrientesDestacados: string[] = [];
  const nombreMicro: Record<string, string> = {
    calcio: 'Calcio',
    hierro: 'Hierro',
    magnesio: 'Magnesio',
    potasio: 'Potasio',
    zinc: 'Zinc',
    vitaminaC: 'Vit. C',
    vitaminaA: 'Vit. A',
  };
  Object.entries(micros).forEach(([clave, total]) => {
    const porPorcion = total / objetivo;
    const vdr = (VDR as Record<string, number>)[clave] || 0;
    if (vdr > 0 && (porPorcion / vdr) * 100 >= 20) {
      micronutrientesDestacados.push(nombreMicro[clave] || clave);
    }
  });

  // 3) Evaluación hildegardiana ponderada por peso + regla de seguridad.
  const evalHild = evaluarHildegardianoDB(itemsHildegarda);
  const hayVeneno = evalHild.venenos.length > 0;
  const requiereCoccionAlguno = cuentaConCoccion > 0;
  const impactoCoccion = impactoMetodoCoccion(metodo, requiereCoccionAlguno);

  // Puntaje ponderado por peso escalado de ingredientes.
  let sumaPeso = 0;
  let sumaPonderada = 0;
  itemsHildegarda.forEach(({ ing, gramos }) => {
    const peso = gramos > 0 ? gramos : 1;
    sumaPeso += peso;
    sumaPonderada += puntajeIngrediente(ing) * peso;
  });
  let puntajeFinal = sumaPeso > 0 ? sumaPonderada / sumaPeso : 50;
  puntajeFinal = Math.max(0, Math.min(100, puntajeFinal + impactoCoccion));
  if (hayVeneno) puntajeFinal = 0; // regla de seguridad

  // Factores explicables.
  const factores = construirFactores(itemsHildegarda, metodo, impactoCoccion, hayVeneno);

  // Impactos livor / bilis negra dominantes.
  const impactoLivor = agregarImpacto(
    detalleIngredientes.map((d) => d.impactoLivor),
    'limpia',
    'genera'
  ) as 'limpia' | 'neutro' | 'genera';
  const impactoBilisNegra = agregarImpacto(
    detalleIngredientes.map((d) => d.impactoBilisNegra),
    'reduce',
    'aumenta'
  ) as 'reduce' | 'neutro' | 'aumenta';

  // Ingredientes destacados (top 3 por aporte ponderado).
  const ingredientesDestacados = topDestacados(itemsHildegarda);

  // 4) Sello viriditas y apto para enfermos (señales globales por peso).
  let pesoViriditas = 0;
  let sumaViriditas = 0;
  let pesoApto = 0;
  let pesoTotalApto = 0;
  itemsHildegarda.forEach(({ ing, gramos }) => {
    const peso = gramos > 0 ? gramos : 1;
    pesoViriditas += peso;
    sumaViriditas += viriditasANumero(ing.viriditas_index as string) * peso;
    pesoTotalApto += peso;
    if (ing.apto_para_enfermos !== false) pesoApto += peso;
  });
  const promedioViriditas = pesoViriditas > 0 ? sumaViriditas / pesoViriditas : 5;
  const selloViriditas = selloDesdePromedio(promedioViriditas);
  const esAptoParaEnfermos =
    !hayVeneno && pesoTotalApto > 0 && pesoApto / pesoTotalApto >= 0.8;

  // 5) Confianza.
  const confianza = calcularConfianza(receta, objetivo, usaPesoCocidoEstimado);

  // 6) Alérgenos + nivel de riesgo.
  const alergenos = construirAlergenos(alergenosPresentes, alergenosPorIngrediente);

  // 7) Advertencias de cocción.
  const advertenciasCoccion = construirAdvertenciasCoccion(detalleIngredientes, metodo);

  // 8) Recomendaciones estructuradas.
  const recomendaciones = construirRecomendaciones(
    detalleIngredientes,
    evalHild,
    metodo,
    hayVeneno
  );

  // 9) Maridaje hildegardiano.
  const maridajeHildegardiano = {
    bebidaRecomendada: 'Vino de hinojo o agua de espelta tibia',
    especiasSugeridas: evalHild.especiasCalidas.length
      ? [...new Set(evalHild.especiasCalidas)]
      : ['galanga', 'canela', 'nuez moscada'],
    postreIdeal: 'Galletas de la alegría (espelta, almendra y especias)',
  };

  // 10) Recomendación global.
  const recomendacion = clasificarRecomendacion(puntajeFinal, hayVeneno);

  const temperamentoDominante =
    moda(detalleIngredientes.map((d) => d.temperamento)) || 'neutro';

  return {
    resumen: {
      caloriasPorPorcion: redondear(porcion.calorias, 0),
      proteinasPorPorcion: redondear(porcion.proteinas_g),
      carbohidratosPorPorcion: redondear(porcion.carbohidratos_g),
      grasasPorPorcion: redondear(porcion.grasas_g),
      porcionesBase,
      porcionesObjetivo: objetivo,
      recomendacion,
      puntajeGlobal: redondear(puntajeFinal, 0),
      selloViriditas,
      esAptoParaEnfermos,
    },
    cientifico: {
      totalesReceta: {
        calorias: redondear(totalesCompletos.calorias, 0),
        proteinas_g: redondear(totalesCompletos.proteinas_g),
        carbohidratos_g: redondear(totalesCompletos.carbohidratos_g),
        grasas_g: redondear(totalesCompletos.grasas_g),
        fibra_g: redondear(totalesCompletos.fibra_g),
      },
      porcion: {
        calorias: redondear(porcion.calorias, 0),
        proteinas_g: redondear(porcion.proteinas_g),
        carbohidratos_g: redondear(porcion.carbohidratos_g),
        grasas_g: redondear(porcion.grasas_g),
        fibra_g: redondear(porcion.fibra_g),
      },
      micronutrientesDestacados,
      pesoCrudoTotal_g: redondear(pesoCrudoCompleto, 0),
      pesoCocidoEstimado_g: redondear(pesoCocidoCompleto, 0),
      factorRendimientoPromedio: redondear(factorRendimientoPromedio, 2),
    },
    hildegardiano: {
      puntajeFinal: redondear(puntajeFinal, 0),
      temperamentoDominante,
      impactoLivor,
      impactoBilisNegra,
      factores,
      ingredientesDestacados,
    },
    detalleIngredientes,
    confianza,
    alergenos,
    metodoCoccion: {
      principal: metodo,
      impactoPuntaje: impactoCoccion,
    },
    advertenciasCoccion,
    maridajeHildegardiano,
    alternativasSanas,
    recomendaciones,
    estacionalidad: {
      estacionActual: estacion,
      ingredientesEnTemporada: enTemporada,
      ingredientesFueraTemporada: fueraTemporada,
      porcentajeTemporada:
        ingredientesConEstacion > 0
          ? redondear((enTemporada.length / ingredientesConEstacion) * 100, 0)
          : 0,
    },
  };
}

// ---- Sub-funciones -----------------------------------------------------

/** Puntaje 0-100 de un ingrediente según sus flags reales. */
function puntajeIngrediente(ing: IngredienteInforme): number {
  if (ing.es_veneno_hildegardiano) return 0;
  let p = 60;
  if (ing.es_base_alegria) p += 25;
  p += ((ing.nivel_subtilitat ?? 5) - 5) * 3; // subtilitat alta suma
  p += (viriditasANumero(ing.viriditas_index as string) - 5) * 2;
  if (ing.apto_para_enfermos !== false) p += 5;
  if (ing.impacto_livor === 'limpia') p += 5;
  if (ing.impacto_livor === 'genera') p -= 8;
  if (ing.impacto_bilis_negra === 'reduce') p += 5;
  if (ing.impacto_bilis_negra === 'aumenta') p -= 8;
  return Math.max(0, Math.min(100, p));
}

function construirFactores(
  items: Array<{ ing: IngredienteNutricion & IngredienteInforme; gramos: number }>,
  metodo: MetodoCoccion,
  impactoCoccion: number,
  hayVeneno: boolean
): InformeDual['hildegardiano']['factores'] {
  const factores: InformeDual['hildegardiano']['factores'] = [];

  items.forEach(({ ing }) => {
    if (ing.es_veneno_hildegardiano) {
      factores.push({
        codigo: 'VENENO',
        etiqueta: ing.nombre,
        tipo: 'penalizacion',
        puntos: -40,
        motivo: ing.propiedades_hildegardianas || 'Veneno de cocina: carga la sangre.',
      });
    } else if (ing.es_base_alegria) {
      factores.push({
        codigo: 'PILAR',
        etiqueta: ing.nombre,
        tipo: 'bonificacion',
        puntos: 15,
        motivo: 'Pilar de vigor (viriditas): aporta alegría y sangre sana.',
      });
    }
    if ((ing.nivel_subtilitat ?? 5) >= 8) {
      factores.push({
        codigo: 'SUBTILITAT_ALTA',
        etiqueta: ing.nombre,
        tipo: 'bonificacion',
        puntos: 5,
        motivo: 'Alta sutileza: el cuerpo lo asimila con facilidad.',
      });
    }
  });

  if (impactoCoccion !== 0) {
    factores.push({
      codigo: 'COCCION',
      etiqueta: `Método: ${metodo}`,
      tipo: impactoCoccion > 0 ? 'bonificacion' : 'penalizacion',
      puntos: impactoCoccion,
      motivo:
        impactoCoccion > 0
          ? 'La cocción suave templa y hace digerible el alimento.'
          : 'El método elegido resta armonía a los humores.',
    });
  }

  if (hayVeneno) {
    factores.push({
      codigo: 'REGLA_SEGURIDAD',
      etiqueta: 'Puntaje forzado a 0',
      tipo: 'penalizacion',
      puntos: 0,
      motivo: 'Contiene un veneno de cocina: la receta se marca como no recomendada.',
    });
  }

  return factores;
}

function agregarImpacto(valores: string[], positivo: string, negativo: string): string {
  let pos = 0;
  let neg = 0;
  valores.forEach((v) => {
    if (v === positivo) pos += 1;
    if (v === negativo) neg += 1;
  });
  if (pos > neg) return positivo;
  if (neg > pos) return negativo;
  return 'neutro';
}

function topDestacados(
  items: Array<{ ing: IngredienteInforme; gramos: number }>
): InformeDual['hildegardiano']['ingredientesDestacados'] {
  return items
    .map(({ ing, gramos }) => {
      const subtilitat = ing.nivel_subtilitat ?? 5;
      const viriditas = viriditasANumero(ing.viriditas_index as string);
      const seguridad = ing.apto_para_enfermos !== false ? 1 : 0;
      const aporte = (subtilitat + viriditas + seguridad * 5) * Math.max(gramos, 1);
      let rol: 'pilar' | 'medicina' | 'base_alegria' | 'precaucion';
      if (ing.es_veneno_hildegardiano) rol = 'precaucion';
      else if (ing.es_base_alegria) rol = 'base_alegria';
      else if ((ing.frecuencia_recomendada || '') === 'medicinal') rol = 'medicina';
      else rol = 'pilar';
      return {
        aporte,
        data: {
          nombre: ing.nombre,
          rol,
          subtilitat,
          viriditas: (ing.viriditas_index as string) || 'moderado',
          mensaje:
            ing.beneficios_hildegardianos ||
            ing.propiedades_hildegardianas ||
            'Aporta equilibrio a la receta.',
        },
      };
    })
    .sort((a, b) => b.aporte - a.aporte)
    .slice(0, 3)
    .map((x) => x.data);
}

function calcularConfianza(
  receta: RecetaInforme,
  objetivo: number,
  usaPesoCocidoEstimado: boolean
): InformeDual['confianza'] {
  let score = 100;
  const motivos: string[] = [];

  if (!receta.peso_cocido_total_g) {
    score -= 20;
    motivos.push('Falta peso cocido total (se usa una estimación por rendimiento).');
  }
  const ingredientes = receta.ingredientes || [];
  if (ingredientes.some((i) => !i.cantidad || i.cantidad <= 0)) {
    score -= 30;
    motivos.push('Hay ingredientes sin cantidad base válida.');
  }
  if (ingredientes.some((i) => !i.ingrediente?.temperamento)) {
    score -= 15;
    motivos.push('Hay ingredientes sin datos hildegardianos completos.');
  }
  if (!receta.porciones_base || receta.porciones_base < 1) {
    score -= 40;
    motivos.push('Porciones base inválidas (se asume 4).');
  }
  if (objetivo <= 0) {
    score -= 40;
    motivos.push('Porciones objetivo inválidas.');
  }

  score = Math.max(0, score);
  return {
    nivel: score >= 80 ? 'alta' : score >= 50 ? 'media' : 'baja',
    score,
    motivos,
    usaPesoCocidoEstimado,
  };
}

function construirAlergenos(
  presentesSet: Set<string>,
  porIngrediente: Record<string, string[]>
): InformeDual['alergenos'] {
  const presentes = Array.from(presentesSet);
  const mayores = presentes.filter((a) =>
    ALERGENOS_MAYORES.includes((a || '').toLowerCase())
  );

  let nivelRiesgo: InformeDual['alergenos']['nivelRiesgo'] = 'ninguno';
  if (presentes.length === 0) nivelRiesgo = 'ninguno';
  else if (presentes.length >= 3 || mayores.length > 0) nivelRiesgo = 'alto';
  else if (presentes.length === 2) nivelRiesgo = 'medio';
  else nivelRiesgo = 'bajo';

  return {
    presentes,
    porIngrediente,
    puedeTrazas: presentes.length > 0,
    nivelRiesgo,
  };
}

function construirAdvertenciasCoccion(
  detalle: InformeDual['detalleIngredientes'],
  metodo: MetodoCoccion
): string[] {
  const advertencias: string[] = [];
  detalle.forEach((d) => {
    if (d.requiereCoccion && metodo === 'crudo') {
      advertencias.push(
        `${d.nombre} requiere cocción y el método declarado es "crudo": cocinarlo antes de servir.`
      );
    }
  });
  return advertencias;
}

function construirRecomendaciones(
  detalle: InformeDual['detalleIngredientes'],
  evalHild: ReturnType<typeof evaluarHildegardianoDB>,
  metodo: MetodoCoccion,
  hayVeneno: boolean
): InformeDual['recomendaciones'] {
  const preparacion: string[] = [];
  const consumo: string[] = [];
  const maridaje: string[] = [];
  const contraindicaciones: string[] = [];

  if (metodo === 'salteado') {
    preparacion.push('Preferir hervido o vapor: templa mejor los humores que el salteado.');
  }
  const requierenCoccion = detalle.filter((d) => d.requiereCoccion && !d.estaCocido);
  if (requierenCoccion.length > 0) {
    preparacion.push(
      `Cocinar bien: ${requierenCoccion.map((d) => d.nombre).join(', ')}.`
    );
  }
  if (evalHild.especiasCalidas.length > 0) {
    maridaje.push(
      `Realzar con especias cálidas: ${[...new Set(evalHild.especiasCalidas)].join(', ')}.`
    );
  } else {
    maridaje.push('Añadir galanga o canela para calentar el "frío interior".');
  }

  const noAptos = detalle.filter((d) => !d.aptoParaEnfermos);
  if (noAptos.length > 0) {
    contraindicaciones.push(
      `No indicado para convalecientes por: ${noAptos.map((d) => d.nombre).join(', ')}.`
    );
  }
  detalle
    .filter((d) => d.contraindicaciones)
    .forEach((d) => contraindicaciones.push(`${d.nombre}: ${d.contraindicaciones}`));

  if (hayVeneno) {
    consumo.push('Sustituir el/los venenos de cocina antes de servir.');
  } else {
    consumo.push('Consumir preferentemente en la comida principal del día.');
  }

  return { preparacion, consumo, maridaje, contraindicaciones };
}

function clasificarRecomendacion(puntaje: number, hayVeneno: boolean): Recomendacion {
  if (hayVeneno) return 'rechazado';
  if (puntaje >= 85) return 'muy_recomendado';
  if (puntaje >= 70) return 'recomendado';
  if (puntaje >= 50) return 'neutral';
  return 'mejorar';
}

function sugerirAlternativa(ing: IngredienteInforme): string {
  const n = (ing.nombre || '').toLowerCase();
  if (n.includes('cerdo')) return 'Cordero o pollo de campo';
  if (n.includes('fresa') || n.includes('frutilla')) return 'Manzana o membrillo';
  if (n.includes('lenteja')) return 'Garbanzos o espelta';
  if (n.includes('berenjena')) return 'Hinojo o zapallo';
  return 'Un pilar de vigor (espelta, hinojo, castañas o almendras)';
}

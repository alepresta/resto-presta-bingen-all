// ============================================================
// Análisis nutricional por plato (por porción) — 100% dinámico.
// Combina la ciencia moderna (macros/micros vs VDR) con la
// evaluación hildegardiana basada en los FLAGS REALES de la BD
// (es_veneno_hildegardiano, es_base_alegria, nivel_subtilitat).
// No clasifica por nombre: usa los datos cargados en cada ingrediente.
// ============================================================
import type { EvaluacionReceta } from './hildegarda';

// Valores Diarios de Referencia (dieta ~2000 kcal)
export const VDR: Record<string, number> = {
  calorias: 2000, proteinas: 50, carbohidratos: 275, grasas: 78,
  grasas_saturadas: 20, fibra: 25, azucar: 50,
  sodio: 2300, calcio: 1000, hierro: 18, magnesio: 400, potasio: 3500, zinc: 15, fosforo: 1000,
  vitaminaA: 900, vitaminaC: 90, vitaminaD: 20, vitaminaE: 15, vitaminaK: 120,
  vitaminaB1: 1.2, vitaminaB2: 1.3, vitaminaB3: 16, vitaminaB5: 5,
  vitaminaB6: 1.7, vitaminaB9: 400, vitaminaB12: 2.4,
};

const COMIDAS_POR_DIA = 3;

// Peso de referencia de una porción de plato principal ya emplatado (g).
const PESO_PORCION_REFERENCIA_G = 400;
// Rango plausible de peso por porción para confiar en las porciones cargadas.
const PESO_PORCION_MIN_G = 150;
const PESO_PORCION_MAX_G = 700;

/**
 * Determina un número de porciones confiable a partir del peso total del plato.
 *
 * - Si las porciones declaradas producen un peso por porción plausible
 *   (150–700 g), se respetan tal cual.
 * - Si no (caso típico: una olla para varios comensales cargada como
 *   "1 porción"), se estima el número de porciones a partir del peso total
 *   usando una ración de referencia. Así el cálculo por porción es fiable
 *   aunque el campo `porciones` esté mal cargado.
 */
export function estimarPorciones(
  pesoTotalGramos: number,
  porcionesDeclaradas?: number | null
): number {
  const declaradas =
    porcionesDeclaradas && porcionesDeclaradas > 0 ? Math.round(porcionesDeclaradas) : 0;

  if (!Number.isFinite(pesoTotalGramos) || pesoTotalGramos <= 0) {
    return declaradas || 1;
  }

  if (declaradas > 0) {
    const pesoPorPorcion = pesoTotalGramos / declaradas;
    if (pesoPorPorcion >= PESO_PORCION_MIN_G && pesoPorPorcion <= PESO_PORCION_MAX_G) {
      return declaradas;
    }
  }

  return Math.max(1, Math.round(pesoTotalGramos / PESO_PORCION_REFERENCIA_G));
}

function tieneInconsistenciaDeRendimiento(pesoTotalGramos: number, porciones: number): boolean {
  if (!Number.isFinite(pesoTotalGramos) || pesoTotalGramos <= 0 || porciones <= 0) return false;
  const pesoPorPorcion = pesoTotalGramos / porciones;
  return pesoPorPorcion < PESO_PORCION_MIN_G || pesoPorPorcion > PESO_PORCION_MAX_G;
}

export interface IngredienteNutricion {
  nombre: string;
  categoria?: string | null;
  calorias?: number | null;
  proteinas_g?: number | null;
  carbohidratos_g?: number | null;
  grasas_g?: number | null;
  grasas_saturadas_g?: number | null;
  fibra_g?: number | null;
  azucar_g?: number | null;
  sodio_mg?: number | null;
  calcio_mg?: number | null;
  hierro_mg?: number | null;
  magnesio_mg?: number | null;
  potasio_mg?: number | null;
  zinc_mg?: number | null;
  fosforo_mg?: number | null;
  vitamina_a_mcg?: number | null;
  vitamina_c_mg?: number | null;
  vitamina_d_mcg?: number | null;
  vitamina_e_mg?: number | null;
  vitamina_k_mcg?: number | null;
  vitamina_b1_mg?: number | null;
  vitamina_b2_mg?: number | null;
  vitamina_b3_mg?: number | null;
  vitamina_b5_mg?: number | null;
  vitamina_b6_mg?: number | null;
  vitamina_b9_mcg?: number | null;
  vitamina_b12_mcg?: number | null;
  // Campos hildegardianos (flags reales de la BD)
  es_veneno_hildegardiano?: boolean | null;
  es_base_alegria?: boolean | null;
  nivel_subtilitat?: number | null;
  requiere_coccion?: boolean | null;
  temperamento?: string | null;
  propiedades_hildegardianas?: string | null;
}

export interface RecetaIngredienteEntrada {
  cantidad: number;
  unidad: string;
  ingrediente: IngredienteNutricion | null;
}

export type Nutricion = Record<keyof typeof VDR, number>;

export interface ResumenLinea {
  icono: string;
  texto: string;
  tono: 'malo' | 'alerta' | 'bien' | 'neutro';
  /** Explicación ampliada (por qué está bajo/en exceso, qué falta, etc.). */
  detalle?: string[];
}

export interface AnalisisPlato {
  tieneDatos: boolean;
  nutricion: Nutricion;
  porcentajeVDR: Record<string, number>;
  micronutrientesBajos: string[];
  excesos: string[];
  hildegardiano: EvaluacionReceta;
  resumen: ResumenLinea[];
  /** Porciones usadas realmente para el cálculo (declaradas o estimadas). */
  porcionesEstimadas?: number;
  /** Peso total del plato en gramos (suma de ingredientes normalizados). */
  pesoTotalGramos?: number;
  /** Estimación del peso ya cocido/emplatado, usando heurísticas de rendimiento. */
  pesoCocidoEstimadoGramos?: number;
  /** Indica que la receta y sus porciones no son consistentes y el análisis es aproximado. */
  bajaConfianza?: boolean;
}

// Micronutrientes que "conviene cubrir" (excluye sodio, que se limita)
const MICRONUTRIENTES: Array<{ clave: keyof typeof VDR; label: string }> = [
  { clave: 'calcio', label: 'Calcio' },
  { clave: 'hierro', label: 'Hierro' },
  { clave: 'magnesio', label: 'Magnesio' },
  { clave: 'potasio', label: 'Potasio' },
  { clave: 'zinc', label: 'Zinc' },
  { clave: 'fosforo', label: 'Fósforo' },
  { clave: 'vitaminaA', label: 'Vit. A' },
  { clave: 'vitaminaC', label: 'Vit. C' },
  { clave: 'vitaminaD', label: 'Vit. D' },
  { clave: 'vitaminaE', label: 'Vit. E' },
  { clave: 'vitaminaK', label: 'Vit. K' },
  { clave: 'vitaminaB1', label: 'Vit. B1' },
  { clave: 'vitaminaB2', label: 'Vit. B2' },
  { clave: 'vitaminaB3', label: 'Vit. B3' },
  { clave: 'vitaminaB5', label: 'Vit. B5' },
  { clave: 'vitaminaB6', label: 'Vit. B6' },
  { clave: 'vitaminaB9', label: 'Vit. B9' },
  { clave: 'vitaminaB12', label: 'Vit. B12' },
];

// Nutrientes a limitar (su exceso es negativo)
const A_LIMITAR: Array<{ clave: keyof typeof VDR; label: string }> = [
  { clave: 'grasas_saturadas', label: 'grasas saturadas' },
  { clave: 'sodio', label: 'sodio' },
  { clave: 'azucar', label: 'azúcar' },
];

export function normalizarAGramos(cantidad: number, unidad: string): number {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return 0;
  const u = (unidad || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Masa
  if (u === 'kg' || u === 'kilo' || u === 'kilos' || u === 'kilogramo' || u === 'kilogramos') return cantidad * 1000;
  if (u === 'gramo' || u === 'gramos' || u === 'g') return cantidad;

  // Volumen (se aproxima 1 ml ~= 1 g para líquidos tipo agua/caldo)
  if (u === 'litro' || u === 'litros' || u === 'l') return cantidad * 1000;
  if (u === 'ml' || u === 'mililitro' || u === 'mililitros' || u === 'cc') return cantidad;

  // Medidas de cocina comunes
  if (u === 'taza' || u === 'tazas') return cantidad * 240;
  if (u === 'cucharada' || u === 'cucharadas' || u === 'cda') return cantidad * 15;
  if (u === 'cucharadita' || u === 'cucharaditas' || u === 'cdta') return cantidad * 5;

  // Piezas
  if (u === 'unidad' || u === 'unidades') return cantidad * 100; // estimación conservadora

  // Medidas cualitativas frecuentes en recetas editoriales
  if (u.includes('pizca')) return cantidad * 0.4;
  if (u.includes('punado')) return cantidad * 30;
  if (u.includes('chorrito')) return cantidad * 10;
  if (u.includes('poco')) return cantidad * 5;
  if (u.includes('moderad')) return cantidad * 2.5;
  if (u.includes('generos')) return cantidad * 7.5;

  // Fallback histórico: asumir gramos para no romper recetas existentes.
  return cantidad;
}

function estimarFactorRendimiento(ing: IngredienteNutricion): number {
  if (!ing.requiere_coccion) return 1;

  const nombre = (ing.nombre || '').toLowerCase();

  if (/(espinaca|acelga|lechuga|rucula|rúcula|berro|espárrago|esparrago)/.test(nombre)) return 0.15;
  if (/(zanahoria|remolacha|betabel|pimiento|morr[oó]n|cebolla|ajo|apio|calabaza|zapallo|zapall[oó]|berenjena|champiñ|champin)/.test(nombre)) {
    return 0.8;
  }
  if (/(harina|espelta|masa|pasta|raviol|fideo|tallar[ií]n|ñoqui|gnocchi|pan)/.test(nombre)) return 1;
  if (/(ricota|queso|huevo|mantequilla|manteca|crema)/.test(nombre)) return 0.98;

  if ((ing.categoria || '').toLowerCase().includes('verd')) return 0.7;
  return 0.9;
}

function nutricionVacia(): Nutricion {
  const n = {} as Nutricion;
  (Object.keys(VDR) as Array<keyof typeof VDR>).forEach((k) => (n[k] = 0));
  return n;
}

/**
 * Analiza una receta (lista de ingredientes con nutrición) para UNA porción.
 */
export function analizarPlato(
  ingredientes: RecetaIngredienteEntrada[],
  porciones: number
): AnalisisPlato {
  // 1) Se totaliza el plato COMPLETO (no por porción) y su peso real.
  const totalReceta = nutricionVacia();
  const ingsPeso: Array<{ ing: IngredienteNutricion; gramos: number }> = [];
  let pesoTotalReceta = 0;
  let pesoCocidoEstimadoReceta = 0;
  let hayIngredientes = false;

  ingredientes.forEach((ri) => {
    const ing = ri.ingrediente;
    if (!ing) return;
    hayIngredientes = true;

    const gramos = normalizarAGramos(ri.cantidad, ri.unidad);
    if (gramos <= 0) return;
    pesoTotalReceta += gramos;
    pesoCocidoEstimadoReceta += gramos * estimarFactorRendimiento(ing);
    const f = gramos / 100; // los valores están por 100 g
    ingsPeso.push({ ing, gramos });

    // Coherencia nutricional a nivel de ingrediente: un subnutriente nunca
    // puede superar a su nutriente padre. Protege contra datos inconsistentes
    // en la BD (p. ej. grasas saturadas > grasas totales).
    const grasas = Math.max(0, ing.grasas_g || 0);
    const grasasSaturadas = Math.min(Math.max(0, ing.grasas_saturadas_g || 0), grasas);
    const carbohidratos = Math.max(0, ing.carbohidratos_g || 0);
    const azucar = Math.min(Math.max(0, ing.azucar_g || 0), carbohidratos);
    const fibra = Math.min(Math.max(0, ing.fibra_g || 0), carbohidratos);

    totalReceta.calorias += (ing.calorias || 0) * f;
    totalReceta.proteinas += (ing.proteinas_g || 0) * f;
    totalReceta.carbohidratos += carbohidratos * f;
    totalReceta.grasas += grasas * f;
    totalReceta.grasas_saturadas += grasasSaturadas * f;
    totalReceta.fibra += fibra * f;
    totalReceta.azucar += azucar * f;
    totalReceta.sodio += (ing.sodio_mg || 0) * f;
    totalReceta.calcio += (ing.calcio_mg || 0) * f;
    totalReceta.hierro += (ing.hierro_mg || 0) * f;
    totalReceta.magnesio += (ing.magnesio_mg || 0) * f;
    totalReceta.potasio += (ing.potasio_mg || 0) * f;
    totalReceta.zinc += (ing.zinc_mg || 0) * f;
    totalReceta.fosforo += (ing.fosforo_mg || 0) * f;
    totalReceta.vitaminaA += (ing.vitamina_a_mcg || 0) * f;
    totalReceta.vitaminaC += (ing.vitamina_c_mg || 0) * f;
    totalReceta.vitaminaD += (ing.vitamina_d_mcg || 0) * f;
    totalReceta.vitaminaE += (ing.vitamina_e_mg || 0) * f;
    totalReceta.vitaminaK += (ing.vitamina_k_mcg || 0) * f;
    totalReceta.vitaminaB1 += (ing.vitamina_b1_mg || 0) * f;
    totalReceta.vitaminaB2 += (ing.vitamina_b2_mg || 0) * f;
    totalReceta.vitaminaB3 += (ing.vitamina_b3_mg || 0) * f;
    totalReceta.vitaminaB5 += (ing.vitamina_b5_mg || 0) * f;
    totalReceta.vitaminaB6 += (ing.vitamina_b6_mg || 0) * f;
    totalReceta.vitaminaB9 += (ing.vitamina_b9_mcg || 0) * f;
    totalReceta.vitaminaB12 += (ing.vitamina_b12_mcg || 0) * f;
  });

  // 2) Porciones confiables: se respeta el dato cargado sólo si da una ración
  //    plausible; si no, se estima a partir del peso total del plato.
  const porcionesEfectivas = estimarPorciones(pesoTotalReceta, porciones);
  const bajaConfianza = tieneInconsistenciaDeRendimiento(pesoTotalReceta, porciones);

  // 3) Nutrición POR PORCIÓN = total del plato / porciones efectivas.
  const nutricion = nutricionVacia();
  (Object.keys(totalReceta) as Array<keyof typeof VDR>).forEach((k) => {
    nutricion[k] = totalReceta[k] / porcionesEfectivas;
  });

  const ingsHildegarda = ingsPeso.map((x) => ({
    ing: x.ing,
    gramos: x.gramos / porcionesEfectivas,
  }));

  // % del VDR diario que aporta la porción
  const porcentajeVDR: Record<string, number> = {};
  (Object.keys(VDR) as Array<keyof typeof VDR>).forEach((k) => {
    porcentajeVDR[k] = VDR[k] > 0 ? (nutricion[k] / VDR[k]) * 100 : 0;
  });

  const hildegardiano = evaluarHildegardianoDB(ingsHildegarda);

  // Sin datos nutricionales cargados
  if (!hayIngredientes || nutricion.calorias === 0) {
    return {
      tieneDatos: false,
      nutricion,
      porcentajeVDR,
      micronutrientesBajos: [],
      excesos: [],
      hildegardiano,
      resumen: construirResumen(0, 0, [], [], [], [], hildegardiano, false),
      porcionesEstimadas: porcionesEfectivas,
      pesoTotalGramos: pesoTotalReceta,
      pesoCocidoEstimadoGramos: pesoCocidoEstimadoReceta,
      bajaConfianza,
    };
  }

  // Estados de macros: referencia por comida = VDR / 3
  const estadoCalorias = clasificarMacro(nutricion.calorias, VDR.calorias / COMIDAS_POR_DIA);
  // Proteínas: en platos mixtos suele ser más útil comparar contra el VDR diario
  // completo para evitar falsos excesos en recetas con queso, huevo o legumbres.
  const estadoProteinas = clasificarMacro(nutricion.proteinas, VDR.proteinas);

  // Micronutrientes bajos: aportan < 15% del VDR diario
  const micronutrientesBajos = MICRONUTRIENTES
    .filter((m) => porcentajeVDR[m.clave] < 15)
    .map((m) => m.label);

  // Detalle: nombre + % del VDR diario que aporta cada micronutriente bajo
  const micronutrientesBajosDetalle = MICRONUTRIENTES
    .filter((m) => porcentajeVDR[m.clave] < 15)
    .map((m) => `${m.label}: ${Math.round(porcentajeVDR[m.clave] || 0)}% del día`);

  // Excesos de nutrientes a limitar (> ración por comida)
  const excesosItems = A_LIMITAR.filter(
    (n) => nutricion[n.clave] > VDR[n.clave] / COMIDAS_POR_DIA
  );
  const excesos = excesosItems.map((n) => n.label);
  const excesosDetalle = excesosItems.map((n) => {
    const valor = nutricion[n.clave];
    const limite = VDR[n.clave] / COMIDAS_POR_DIA;
    const unidad = n.clave === 'sodio' ? 'mg' : 'g';
    return `${cap(n.label)}: ${fmtNum(valor)} ${unidad} (límite por comida ~${fmtNum(limite)} ${unidad})`;
  });

  const resumen = construirResumen(
    estadoCalorias,
    estadoProteinas,
    micronutrientesBajos,
    micronutrientesBajosDetalle,
    excesos,
    excesosDetalle,
    hildegardiano,
    true,
    { calorias: nutricion.calorias, proteinas: nutricion.proteinas }
  );

  return {
    tieneDatos: true,
    nutricion,
    porcentajeVDR,
    micronutrientesBajos,
    excesos,
    hildegardiano,
    resumen,
    porcionesEstimadas: porcionesEfectivas,
    pesoTotalGramos: pesoTotalReceta,
    pesoCocidoEstimadoGramos: pesoCocidoEstimadoReceta,
    bajaConfianza,
  };
}

type EstadoMacro = -1 | 0 | 1; // bajo | adecuado | exceso

function clasificarMacro(valor: number, refPorComida: number): EstadoMacro {
  if (refPorComida <= 0) return 0;
  const ratio = valor / refPorComida;
  if (ratio > 1.2) return 1;
  if (ratio < 0.6) return -1;
  return 0;
}

function fmtNum(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(1);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lineaMacro(
  nombre: string,
  estado: EstadoMacro,
  valor: number,
  unidad: string,
  refPorComida: number
): ResumenLinea {
  const pct = refPorComida > 0 ? Math.round((valor / refPorComida) * 100) : 0;
  const base = `Aporta ${fmtNum(valor)} ${unidad} · ${pct}% de lo recomendado para una comida (~${fmtNum(refPorComida)} ${unidad})`;
  if (estado === 1)
    return {
      icono: '🔴',
      texto: `${nombre}: Exceso`,
      tono: 'malo',
      detalle: [base, 'Supera la ración sugerida por comida.'],
    };
  if (estado === -1)
    return {
      icono: '🔵',
      texto: `${nombre}: Bajo`,
      tono: 'alerta',
      detalle: [base, 'Queda por debajo de lo esperado para una comida completa.'],
    };
  return {
    icono: '🟢',
    texto: `${nombre}: Adecuado`,
    tono: 'bien',
    detalle: [base],
  };
}

function construirResumen(
  estadoCalorias: EstadoMacro,
  estadoProteinas: EstadoMacro,
  micronutrientesBajos: string[],
  micronutrientesBajosDetalle: string[],
  excesos: string[],
  excesosDetalle: string[],
  hildegardiano: EvaluacionReceta,
  tieneDatos: boolean,
  valores?: { calorias: number; proteinas: number }
): ResumenLinea[] {
  const lineas: ResumenLinea[] = [];

  if (tieneDatos) {
    lineas.push(
      lineaMacro('Calorías', estadoCalorias, valores?.calorias ?? 0, 'kcal', VDR.calorias / COMIDAS_POR_DIA)
    );
    lineas.push(
      lineaMacro('Proteínas', estadoProteinas, valores?.proteinas ?? 0, 'g', VDR.proteinas / COMIDAS_POR_DIA)
    );

    if (micronutrientesBajos.length > 0) {
      lineas.push({
        icono: '⚠️',
        texto: `${micronutrientesBajos.length} vitaminas/minerales bajos`,
        tono: 'alerta',
        detalle: micronutrientesBajosDetalle,
      });
    } else {
      lineas.push({ icono: '🟢', texto: 'Micronutrientes cubiertos', tono: 'bien' });
    }

    if (excesos.length > 0) {
      lineas.push({
        icono: '⚠️',
        texto: `Exceso de ${excesos.join(', ')}`,
        tono: 'alerta',
        detalle: excesosDetalle,
      });
    }
  } else {
    lineas.push({ icono: 'ℹ️', texto: 'Sin datos nutricionales cargados', tono: 'neutro' });
  }

  lineas.push(lineaHildegarda(hildegardiano));
  return lineas;
}

function lineaHildegarda(h: EvaluacionReceta): ResumenLinea {
  const mapa: Record<EvaluacionReceta['nivel'], ResumenLinea> = {
    excelente: { icono: '🌿', texto: 'Santa Hildegarda: Muy equilibrado', tono: 'bien' },
    aceptable: { icono: '🌿', texto: 'Santa Hildegarda: Equilibrado', tono: 'bien' },
    con_precaucion: { icono: '⚠️', texto: 'Santa Hildegarda: Con precaución', tono: 'alerta' },
    no_hildegardiano: { icono: '🚫', texto: 'Santa Hildegarda: No recomendado', tono: 'malo' },
  };
  return mapa[h.nivel];
}

// ============================================================
// Evaluación hildegardiana basada en los flags REALES de la BD.
// No adivina por nombre: usa es_veneno_hildegardiano, es_base_alegria
// y nivel_subtilitat cargados en cada ingrediente.
// ============================================================
export function evaluarHildegardianoDB(
  items: Array<{ ing: IngredienteNutricion; gramos: number }>
): EvaluacionReceta {
  const venenos: EvaluacionReceta['venenos'] = [];
  const pilares: EvaluacionReceta['pilares'] = [];
  const especiasCalidas: string[] = [];

  let pesoTotal = 0;
  let subtilitatPonderada = 0;

  items.forEach(({ ing, gramos }) => {
    const peso = gramos > 0 ? gramos : 1;
    pesoTotal += peso;
    subtilitatPonderada += (ing.nivel_subtilitat ?? 5) * peso;

    if (ing.es_veneno_hildegardiano) {
      venenos.push({
        nombre: ing.nombre,
        razon: ing.propiedades_hildegardianas || 'Marcado como veneno de cocina en la base de datos.',
      });
    }
    if (ing.es_base_alegria) {
      pilares.push({
        nombre: ing.nombre,
        razon: ing.propiedades_hildegardianas || 'Pilar de vigor (base de alegría).',
      });
    }
  });

  const subtilitat = pesoTotal > 0 ? subtilitatPonderada / pesoTotal : 5; // 0-10

  // Puntaje 0-100
  let puntaje = subtilitat * 10;
  puntaje -= venenos.length * 40;
  puntaje += pilares.length * 5;
  puntaje = Math.max(0, Math.min(100, Math.round(puntaje)));

  let nivel: EvaluacionReceta['nivel'];
  if (venenos.length > 0) nivel = 'no_hildegardiano';
  else if (puntaje >= 85 && pilares.length > 0) nivel = 'excelente';
  else nivel = 'aceptable';

  const recomendaciones: string[] = [];
  if (venenos.length > 0) {
    recomendaciones.push(
      `🚫 Contiene venenos de cocina: ${[...new Set(venenos.map((v) => v.nombre))].join(', ')}. Conviene sustituirlos.`
    );
  }
  if (pilares.length === 0) {
    recomendaciones.push('✨ Sumar al menos un pilar de vigor (ej. espelta, hinojo, castañas).');
  }
  if (recomendaciones.length === 0) {
    recomendaciones.push('✅ Receta en armonía con los principios hildegardianos.');
  }

  const veredictos: Record<EvaluacionReceta['nivel'], string> = {
    excelente: '🌿 Excelente: medicina convertida en alimento.',
    aceptable: '👍 Aceptable: cumple los principios, con margen de mejora.',
    con_precaucion: '⚠️ Aceptable con precaución: revisar ingredientes marcados.',
    no_hildegardiano: '🚫 No hildegardiano: contiene venenos de cocina que deben sustituirse.',
  };

  return {
    cumple: venenos.length === 0,
    nivel,
    puntaje,
    venenos,
    precauciones: [],
    pilares,
    especiasCalidas,
    recomendaciones,
    veredicto: veredictos[nivel],
  };
}

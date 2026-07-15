// ============================================================
// Utilidad compartida de ESCALADO y REDONDEO de recetas.
// Problema 2 del plan: porción base explícita (4) y escalado
// automático exacto a cualquier cantidad de comensales.
//
// Reglas del plan:
//  - factor = porciones_objetivo / porciones_base
//  - lineal:            cantidad_base * factor
//  - sublineal:         cantidad_base * sqrt(factor)   (sal, especias intensas)
//  - constante_minima:  max(cantidad_minima, cantidad_base * factor)
//
// Se devuelven SIEMPRE dos valores:
//  - cantidadCalculada: exacta, para analítica.
//  - cantidadMostrada:  amigable para cocina (redondeo culinario).
// ============================================================

export type CategoriaEscalado = 'lineal' | 'sublineal' | 'constante_minima';

export const PORCIONES_BASE_DEFAULT = 4;

/** Factor de escala entre la porción objetivo y la porción base. */
export function factorEscala(porcionesObjetivo: number, porcionesBase: number): number {
  const base = porcionesBase > 0 ? porcionesBase : PORCIONES_BASE_DEFAULT;
  const objetivo = porcionesObjetivo > 0 ? porcionesObjetivo : base;
  return objetivo / base;
}

/** Normaliza el nombre de una unidad (minúsculas, sin acentos). */
function normUnidad(unidad: string): string {
  return (unidad || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export type TipoUnidad = 'masa' | 'volumen' | 'pieza' | 'cualitativa';

/** Clasifica la unidad para elegir la regla de redondeo culinario adecuada. */
export function tipoUnidad(unidad: string): TipoUnidad {
  const u = normUnidad(unidad);
  if (['g', 'gramo', 'gramos', 'kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(u)) return 'masa';
  if (['ml', 'mililitro', 'mililitros', 'cc', 'l', 'litro', 'litros'].includes(u)) return 'volumen';
  if (['unidad', 'unidades', 'u', 'diente', 'dientes', 'huevo', 'huevos'].includes(u)) return 'pieza';
  if (
    u.includes('pizca') ||
    u.includes('cucharad') ||
    u.includes('cdta') ||
    u.includes('cda') ||
    u.includes('punado') ||
    u.includes('chorrito') ||
    u.includes('poco') ||
    u.includes('generos') ||
    u.includes('moderad')
  ) {
    return 'cualitativa';
  }
  return 'masa';
}

export interface ResultadoEscalado {
  /** Cantidad exacta calculada (para totales y análisis nutricional). */
  cantidadCalculada: number;
  /** Cantidad redondeada, amigable para cocina. */
  cantidadMostrada: number;
  /** Texto de cocina listo para mostrar (incluye equivalencias cómodas). */
  textoMostrado: string;
  /** True si la porción resultante es demasiado pequeña para prepararse bien. */
  fraccionExtrema: boolean;
}

/**
 * Escala UNA cantidad de ingrediente desde la porción base a la objetivo,
 * aplicando la categoría de escalado y el redondeo culinario correspondiente.
 */
export function escalarIngrediente(params: {
  cantidadBase: number;
  unidad: string;
  porcionesObjetivo: number;
  porcionesBase?: number;
  categoria?: CategoriaEscalado;
  cantidadMinima?: number;
}): ResultadoEscalado {
  const {
    cantidadBase,
    unidad,
    porcionesObjetivo,
    porcionesBase = PORCIONES_BASE_DEFAULT,
    categoria = 'lineal',
    cantidadMinima,
  } = params;

  const factor = factorEscala(porcionesObjetivo, porcionesBase);

  let cantidadCalculada: number;
  switch (categoria) {
    case 'sublineal':
      cantidadCalculada = cantidadBase * Math.sqrt(factor);
      break;
    case 'constante_minima': {
      const minima = cantidadMinima != null ? cantidadMinima : cantidadBase;
      cantidadCalculada = Math.max(minima, cantidadBase * factor);
      break;
    }
    case 'lineal':
    default:
      cantidadCalculada = cantidadBase * factor;
      break;
  }

  if (!Number.isFinite(cantidadCalculada) || cantidadCalculada < 0) cantidadCalculada = 0;

  const tipo = tipoUnidad(unidad);
  const { cantidadMostrada, textoMostrado } = redondearCulinario(cantidadCalculada, unidad, tipo);

  // Fracción extrema: menos de 0.1 de una pieza (huevo, diente...) es incocinable.
  const fraccionExtrema = tipo === 'pieza' && cantidadCalculada > 0 && cantidadCalculada < 0.1;

  return { cantidadCalculada, cantidadMostrada, textoMostrado, fraccionExtrema };
}

/** Redondea una fracción de pieza al cuarto más cercano (0.25 / 0.5 / 0.75). */
function redondearFraccion(valor: number): number {
  return Math.round(valor * 4) / 4;
}

/**
 * Reglas de redondeo práctico por tipo de unidad.
 * Devuelve la cantidad amigable y su texto listo para cocina.
 */
export function redondearCulinario(
  cantidad: number,
  unidad: string,
  tipo: TipoUnidad = tipoUnidad(unidad)
): { cantidadMostrada: number; textoMostrado: string } {
  const u = normUnidad(unidad);

  if (cantidad <= 0) {
    return { cantidadMostrada: 0, textoMostrado: `0 ${unidad}`.trim() };
  }

  switch (tipo) {
    case 'masa':
    case 'volumen': {
      // Gramos/ml: entero si es grande, 1 decimal si es chico.
      let valor: number;
      if (cantidad >= 100) valor = Math.round(cantidad);
      else if (cantidad >= 10) valor = Math.round(cantidad);
      else valor = Math.round(cantidad * 10) / 10;
      return { cantidadMostrada: valor, textoMostrado: `${formatearNumero(valor)} ${unidad}`.trim() };
    }
    case 'pieza': {
      // Fracciones cómodas: 0.25 / 0.5 / 0.75 / entero.
      const valor = redondearFraccion(cantidad);
      const texto = fraccionTexto(valor);
      return { cantidadMostrada: valor, textoMostrado: `${texto} ${unidad}`.trim() };
    }
    case 'cualitativa':
    default: {
      // Redondeo culinario suave para pizcas/cucharaditas.
      if (u.includes('pizca')) {
        if (cantidad < 0.5) return { cantidadMostrada: 0.5, textoMostrado: 'pizca chica' };
        if (cantidad < 1.5) return { cantidadMostrada: 1, textoMostrado: '1 pizca' };
        return { cantidadMostrada: Math.round(cantidad), textoMostrado: `${Math.round(cantidad)} pizcas` };
      }
      const valor = redondearFraccion(cantidad);
      const texto = fraccionTexto(valor);
      return { cantidadMostrada: valor, textoMostrado: `${texto} ${unidad}`.trim() };
    }
  }
}

/** Formatea un número quitando decimales innecesarios. */
export function formatearNumero(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1).replace(/\.0$/, '');
}

/** Convierte una fracción a texto de cocina amigable (¼, ½, ¾). */
function fraccionTexto(valor: number): string {
  const entero = Math.floor(valor);
  const frac = valor - entero;
  const mapa: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
  const fracKey = frac.toFixed(2).replace(/0$/, '');
  const simbolo = mapa[frac.toString()] || mapa[fracKey];

  if (entero === 0 && simbolo) return simbolo;
  if (simbolo) return `${entero} ${simbolo}`;
  return formatearNumero(valor);
}

/**
 * Valida un pedido de escalado y devuelve advertencias de casos límite.
 */
export function validarEscalado(porcionesObjetivo: number, porcionesBase: number): {
  valido: boolean;
  advertencias: string[];
} {
  const advertencias: string[] = [];
  let valido = true;

  if (!porcionesObjetivo || porcionesObjetivo <= 0) {
    valido = false;
    advertencias.push('Las porciones objetivo deben ser al menos 1.');
  }
  if (!porcionesBase || porcionesBase <= 0) {
    advertencias.push('La receta no declara porciones base; se asume 4.');
  }
  if (porcionesObjetivo > 0 && porcionesBase > 0 && porcionesObjetivo / porcionesBase < 0.25) {
    advertencias.push('Escala muy pequeña: conviene preparar un mínimo de 2 porciones.');
  }

  return { valido, advertencias };
}

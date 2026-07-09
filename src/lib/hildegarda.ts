// ============================================================
// Reglas de evaluación hildegardiana (Subtilitat / Viriditas)
// Basado en los principios de Santa Hildegarda de Bingen.
// Clasifica ingredientes por nombre (no depende de flags de la BD).
// ============================================================

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .trim();
}

function contiene(nombre: string, claves: string[]): string | null {
  const n = norm(nombre);
  for (const k of claves) {
    if (n.includes(norm(k))) return k;
  }
  return null;
}

// 4) Venenos de cocina (Küchengifte) — 0% de cumplimiento
const VENENOS: Record<string, string> = {
  frutilla: 'Crece en tierra húmeda; genera mucosidad (livor) y ensucia la sangre',
  fresa: 'Crece en tierra húmeda; genera mucosidad (livor) y ensucia la sangre',
  durazno: 'Fruta que debilita los órganos internos',
  'pelon': 'Durazno pelón: debilita los órganos internos',
  apio: 'El apio crudo induce a la bilis negra y melancolía',
  batata: 'Rechazada: pesada y de humores fríos',
  banana: 'Induce melancolía',
  platano: 'Induce melancolía',
  melon: 'Rechazado: enfría y humedece en exceso',
  palta: 'Pesada para los humores',
  aguacate: 'Pesada para los humores',
  anana: 'Rechazada por su naturaleza',
  'pina': 'Rechazada por su naturaleza',
  pepino: 'Pepino crudo: enfría el bazo',
  berenjena: 'Solanácea que genera bilis negra y tristeza',
  choclo: 'Maíz: rechazado por naturaleza',
  maiz: 'Rechazado por naturaleza',
  sandia: 'Enfría y humedece en exceso',
  cerdo: 'Prohibida: alimenta enfermedades graves',
  anguila: 'Pez sin escamas con "livor venenoso"',
  lenteja: 'Induce a la bilis negra y melancolía',
};

// Puerro: veneno sólo en exceso (se marca como precaución fuerte)
const VENENO_EXCESO: Record<string, string> = {
  puerro: 'Calma deseos libidinosos pero agita los humores si se abusa',
};

// 3) Pilares de Vigor (Viriditas)
const PILARES: Record<string, string> = {
  espelta: 'El cereal supremo: hace al hombre alegre y genera carne sana',
  farro: 'Espelta (farro): cereal supremo, alegría y buena sangre',
  hinojo: 'Vegetal "sin defecto": digestión perfecta y buen olor corporal',
  castana: 'Fortalece el cerebro y los nervios (Discretio)',
  almendra: 'Remedio universal: "llena el cerebro" y fortifica los nervios',
};

// Excepción: tolerables crudos
const CRUDO_TOLERABLE = ['hinojo', 'castana', 'manzana', 'membrillo', 'almendra'];

// 1) Solanáceas y otros a usar con precaución
const PRECAUCION: Record<string, string> = {
  papa: 'Solanácea sin sutileza curativa descrita; puede agravar inflamaciones',
  tomate: '"Planta de la sombra" (solanácea); debe cocinarse mucho',
  aceituna: 'Su aceite es bueno, pero en exceso produce moco pulmonar',
  rabano: 'Debe comerse con galanga para neutralizar su impacto',
  lechuga: 'Debe marinarse con vinagre, sal y aceite para que no dañe el cerebro',
  chaucha: 'Usar en poca cantidad',
  damasco: 'Usar con precaución',
  'cebolla de verdeo': 'Siempre cocida',
};

// Especias cálidas recomendadas (calientan el "frío interior")
const ESPECIAS_CALIDAS = ['galanga', 'canela', 'nuez moscada', 'pelitre', 'bertram', 'jengibre'];

export interface ClasificacionIngrediente {
  nombre: string;
  veneno: boolean;
  razonVeneno: string | null;
  precaucion: string | null;
  pilar: string | null; // nombre del pilar si aplica
  toleraCrudo: boolean;
  especiaCalida: boolean;
}

export function clasificarIngrediente(nombre: string): ClasificacionIngrediente {
  const claveVeneno = contiene(nombre, Object.keys(VENENOS));
  const claveExceso = contiene(nombre, Object.keys(VENENO_EXCESO));
  const clavePilar = contiene(nombre, Object.keys(PILARES));
  const clavePrec = contiene(nombre, Object.keys(PRECAUCION));

  return {
    nombre,
    veneno: !!claveVeneno,
    razonVeneno: claveVeneno ? VENENOS[claveVeneno] : null,
    precaucion: clavePrec
      ? PRECAUCION[clavePrec]
      : claveExceso
      ? VENENO_EXCESO[claveExceso]
      : null,
    pilar: clavePilar ? PILARES[clavePilar] : null,
    toleraCrudo: !!contiene(nombre, CRUDO_TOLERABLE),
    especiaCalida: !!contiene(nombre, ESPECIAS_CALIDAS),
  };
}

export interface EvaluacionReceta {
  cumple: boolean;
  nivel: 'excelente' | 'aceptable' | 'con_precaucion' | 'no_hildegardiano';
  puntaje: number; // 0-100
  venenos: Array<{ nombre: string; razon: string }>;
  precauciones: Array<{ nombre: string; motivo: string }>;
  pilares: Array<{ nombre: string; razon: string }>;
  especiasCalidas: string[];
  recomendaciones: string[];
  veredicto: string;
}

// Evalúa una receta según la lista de nombres de ingredientes
export function evaluarReceta(nombresIngredientes: string[]): EvaluacionReceta {
  const venenos: Array<{ nombre: string; razon: string }> = [];
  const precauciones: Array<{ nombre: string; motivo: string }> = [];
  const pilares: Array<{ nombre: string; razon: string }> = [];
  const especiasCalidas: string[] = [];

  nombresIngredientes.forEach((nombre) => {
    const c = clasificarIngrediente(nombre);
    if (c.veneno && c.razonVeneno) venenos.push({ nombre, razon: c.razonVeneno });
    else if (c.precaucion) precauciones.push({ nombre, motivo: c.precaucion });
    if (c.pilar) pilares.push({ nombre, razon: c.pilar });
    if (c.especiaCalida) especiasCalidas.push(nombre);
  });

  // Puntaje: parte de 100, descuenta por venenos/precauciones, suma por pilares
  let puntaje = 100;
  puntaje -= venenos.length * 40;
  puntaje -= precauciones.length * 12;
  if (pilares.length === 0) puntaje -= 20; // sin ningún pilar de vigor
  else puntaje = Math.min(100, puntaje + (pilares.length - 1) * 5);
  puntaje = Math.max(0, Math.min(100, puntaje));

  let nivel: EvaluacionReceta['nivel'];
  if (venenos.length > 0) nivel = 'no_hildegardiano';
  else if (precauciones.length > 0) nivel = 'con_precaucion';
  else if (pilares.length > 0 && puntaje >= 85) nivel = 'excelente';
  else nivel = 'aceptable';

  const recomendaciones: string[] = [];
  if (venenos.length > 0) {
    recomendaciones.push(
      `🚫 Sustituir los venenos de cocina: ${[...new Set(venenos.map((v) => v.nombre))].join(', ')}. Hildegarda: "cargan la sangre de sustancias nocivas".`
    );
  }
  if (precauciones.length > 0) {
    recomendaciones.push(
      `⚠️ Usar con precaución (poca cantidad o bien cocidos): ${[...new Set(precauciones.map((p) => p.nombre))].join(', ')}.`
    );
  }
  if (pilares.length === 0) {
    recomendaciones.push('✨ Sumar al menos un pilar de vigor: espelta, hinojo, castañas o almendras.');
  }
  const tieneEspelta = pilares.some((p) => norm(p.nombre).includes('espelta') || norm(p.nombre).includes('farro'));
  if (!tieneEspelta) {
    recomendaciones.push('🌾 Preferir harina de espelta: es el carbohidrato que "hace al hombre alegre".');
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
    precauciones,
    pilares,
    especiasCalidas,
    recomendaciones,
    veredicto: veredictos[nivel],
  };
}

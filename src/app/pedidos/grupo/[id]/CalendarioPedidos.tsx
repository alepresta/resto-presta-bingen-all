'use client';

import { useState, useEffect, useMemo } from 'react';
import { DIAS_SEMANA, CATEGORIAS_COMIDA } from '@/lib/pedidos';
import { evaluarReceta } from '@/lib/hildegarda';

// Parseo/format de fechas 'YYYY-MM-DD' de forma estable en cualquier zona horaria
// (evita desajustes de día entre el render del servidor y la hidratación del cliente).
function parseFechaLocal(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatFechaLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Conversión a gramos/ml para el cálculo nutricional
function normalizarAGramos(cantidad: number, unidad: string): number {
  const u = (unidad || '').toLowerCase();
  if (u === 'kg' || u === 'kilogramos') return cantidad * 1000;
  if (u === 'gramos' || u === 'g') return cantidad;
  if (u === 'litros' || u === 'l') return cantidad * 1000;
  if (u === 'ml' || u === 'mililitros') return cantidad;
  if (u === 'tazas') return cantidad * 240;
  if (u === 'cucharadas') return cantidad * 15;
  if (u === 'cucharadita') return cantidad * 5;
  if (u === 'unidades' || u === 'unidad') return cantidad * 100;
  return cantidad;
}

// Valores diarios de referencia (aprox.)
const VDR_DIA: Record<string, number> = {
  calorias: 2000, proteinas: 50, carbohidratos: 275, grasas: 78, grasas_saturadas: 20,
  fibra: 25, azucar: 50, sodio: 2300, calcio: 1000, hierro: 18, magnesio: 400, potasio: 3500,
  zinc: 11, fosforo: 700, vitaminaA: 900, vitaminaC: 90, vitaminaD: 20, vitaminaE: 15, vitaminaK: 120,
  vitaminaB1: 1.2, vitaminaB2: 1.3, vitaminaB3: 16, vitaminaB5: 5, vitaminaB6: 1.3, vitaminaB9: 400, vitaminaB12: 2.4,
};
// Nutrientes cuyo VDR es un máximo recomendado
const VDR_MAX = new Set(['grasas_saturadas', 'azucar', 'sodio']);
// Lista completa de nutrientes para la tabla científica
const NUTRIENTES_LISTA: Array<{ key: string; l: string; u: string }> = [
  { key: 'calorias', l: 'Calorías', u: 'kcal' },
  { key: 'proteinas', l: 'Proteínas', u: 'g' },
  { key: 'carbohidratos', l: 'Carbohidratos', u: 'g' },
  { key: 'grasas', l: 'Grasas', u: 'g' },
  { key: 'grasas_saturadas', l: 'Grasas saturadas', u: 'g' },
  { key: 'fibra', l: 'Fibra', u: 'g' },
  { key: 'azucar', l: 'Azúcar', u: 'g' },
  { key: 'sodio', l: 'Sodio', u: 'mg' },
  { key: 'calcio', l: 'Calcio', u: 'mg' },
  { key: 'hierro', l: 'Hierro', u: 'mg' },
  { key: 'magnesio', l: 'Magnesio', u: 'mg' },
  { key: 'potasio', l: 'Potasio', u: 'mg' },
  { key: 'zinc', l: 'Zinc', u: 'mg' },
  { key: 'fosforo', l: 'Fósforo', u: 'mg' },
  { key: 'vitaminaA', l: 'Vitamina A', u: 'mcg' },
  { key: 'vitaminaC', l: 'Vitamina C', u: 'mg' },
  { key: 'vitaminaD', l: 'Vitamina D', u: 'mcg' },
  { key: 'vitaminaE', l: 'Vitamina E', u: 'mg' },
  { key: 'vitaminaK', l: 'Vitamina K', u: 'mcg' },
  { key: 'vitaminaB1', l: 'Vitamina B1', u: 'mg' },
  { key: 'vitaminaB2', l: 'Vitamina B2', u: 'mg' },
  { key: 'vitaminaB3', l: 'Vitamina B3', u: 'mg' },
  { key: 'vitaminaB5', l: 'Vitamina B5', u: 'mg' },
  { key: 'vitaminaB6', l: 'Vitamina B6', u: 'mg' },
  { key: 'vitaminaB9', l: 'Vitamina B9', u: 'mcg' },
  { key: 'vitaminaB12', l: 'Vitamina B12', u: 'mcg' },
];
// Agrupación de nutrientes para presentar la tabla científica de forma entendible
const NUTRIENTES_GRUPOS: Array<{ titulo: string; icono: string; keys: string[] }> = [
  { titulo: 'Macronutrientes', icono: '🥗', keys: ['calorias', 'proteinas', 'carbohidratos', 'grasas', 'grasas_saturadas', 'fibra', 'azucar'] },
  { titulo: 'Minerales', icono: '⛏️', keys: ['sodio', 'calcio', 'hierro', 'magnesio', 'potasio', 'zinc', 'fosforo'] },
  { titulo: 'Vitaminas', icono: '💊', keys: ['vitaminaA', 'vitaminaC', 'vitaminaD', 'vitaminaE', 'vitaminaK', 'vitaminaB1', 'vitaminaB2', 'vitaminaB3', 'vitaminaB5', 'vitaminaB6', 'vitaminaB9', 'vitaminaB12'] },
];
// Metadatos (label + unidad) por clave de nutriente, para buscar rápido
const NUTRIENTE_META: Record<string, { l: string; u: string }> = Object.fromEntries(
  NUTRIENTES_LISTA.map((n) => [n.key, { l: n.l, u: n.u }])
);
// Pilares de alegría hildegardianos
const PILARES_ALEGRIA = ['espelta', 'hinojo', 'galanga', 'castaña'];

function obtenerPilarNombre(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('espelta')) return 'Espelta';
  if (n.includes('hinojo')) return 'Hinojo';
  if (n.includes('galanga')) return 'Galanga';
  if (n.includes('castaña') || n.includes('castana')) return 'Castañas';
  return nombre;
}

interface Ingrediente {
  id: string;
  nombre: string;
  temperamento: string | null;
  es_veneno_hildegardiano: boolean;
  es_base_alegria?: boolean;
  nivel_subtilitat?: number | null;
  requiere_coccion?: boolean;
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
}

interface Plato {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria_id: number;
  dia_semana_id: number | null;
  disponible_todos_dias: boolean;
  alergenos: string[];
  tags: string[];
  receta?: {
    id: string;
    pasos?: string[];
    tiempo_min?: number | null;
    porciones?: number | null;
    dificultad?: string | null;
    notas_hildegardianas?: string | null;
    interpretacion_hildegardiana?: string | null;
    ingredientes?: Array<{
      cantidad?: number;
      unidad?: string;
      ingrediente: Ingrediente;
    }>;
  } | null;
}

interface Cliente {
  id: string;
  nombre: string;
  email: string;
}

interface Miembro {
  id: string;
  cliente_id: string;
  cliente: Cliente;
  rol: string;
  confirmado_general: boolean;
}

interface ItemPedido {
  id: string;
  fecha: string;
  tipo_comida: string;
  plato_id: string;
  cantidad: number;
  seleccionado_por: string;
  votos: string[];
  plato?: Plato;
}

interface CalendarioPedidosProps {
  grupoId: string;
  palabraSecreta: string;
  fechaInicio: string;
  fechaFin: string;
  miembros: Miembro[];
  items: ItemPedido[];
  platos: Plato[];
  clienteActualId: string;
}

const TIPOS_COMIDA = [
  { id: 'desayuno', label: 'Desayuno', icono: '☕', categoriaId: CATEGORIAS_COMIDA.DESAYUNO },
  { id: 'almuerzo', label: 'Almuerzo', icono: '🍽️', categoriaId: CATEGORIAS_COMIDA.PLATO_PRINCIPAL },
  { id: 'guarnicion', label: 'Guarnición', icono: '🥗', categoriaId: CATEGORIAS_COMIDA.GUARNICION },
  { id: 'postre', label: 'Postre', icono: '🍰', categoriaId: CATEGORIAS_COMIDA.POSTRE },
  { id: 'bebida', label: 'Bebida', icono: '🥤', categoriaId: CATEGORIAS_COMIDA.BEBIDA },
];

const CATEGORIAS_FILTRO = [
  { id: 1, nombre: 'Desayuno', icono: '☕' },
  { id: 2, nombre: 'Almuerzo', icono: '🍽️' },
  { id: 3, nombre: 'Guarnición', icono: '🥗' },
  { id: 4, nombre: 'Bebida', icono: '🥤' },
  { id: 5, nombre: 'Postre', icono: '🍰' },
];

const TEMPERAMENTOS = [
  { valor: 'calido', nombre: '🌡️ Cálido' },
  { valor: 'calido_seco', nombre: '🔥 Cálido-Seco' },
  { valor: 'calido_humedo', nombre: '🌊 Cálido-Húmedo' },
  { valor: 'frio', nombre: '❄️ Frío' },
  { valor: 'frio_seco', nombre: '🍃 Frío-Seco' },
  { valor: 'frio_humedo', nombre: '💧 Frío-Húmedo' },
];

// Devuelve el nombre legible (con ícono) de un temperamento hildegardiano
function temperamentoLabel(valor: string | null | undefined): string {
  if (!valor) return '—';
  const t = TEMPERAMENTOS.find((x) => x.valor === valor);
  return t ? t.nombre : valor;
}

// Estado tipo semáforo de un valor respecto a su meta diaria (calorías, proteínas)
function estadoMeta(val: number, meta: number) {
  const pct = meta ? (val / meta) * 100 : 0;
  if (pct >= 130) return { emoji: '🔴', label: 'Exceso', bg: 'bg-red-100 text-red-800', bar: 'bg-red-500' };
  if (pct >= 90) return { emoji: '🟢', label: 'Adecuado', bg: 'bg-green-100 text-green-800', bar: 'bg-green-500' };
  if (pct >= 60) return { emoji: '🟡', label: 'Bajo', bg: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-500' };
  return { emoji: '🟠', label: 'Muy bajo', bg: 'bg-orange-100 text-orange-800', bar: 'bg-orange-500' };
}

// Describe en palabras simples cuánto aporta respecto a lo recomendado
function vecesTexto(pct: number): string {
  const veces = pct / 100;
  if (veces >= 3) return 'más del triple de lo recomendado';
  if (veces >= 2) return 'más del doble de lo recomendado';
  if (veces >= 1.3) return 'por encima de lo recomendado';
  if (veces >= 0.9) return 'una cantidad adecuada';
  if (veces >= 0.6) return 'un poco por debajo de lo recomendado';
  return 'muy por debajo de lo recomendado';
}

// Evalúa un perfil nutricional DIARIO (totales del día o promedio diario del plan)
// y clasifica micronutrientes ausentes, insuficientes y nutrientes en exceso.
function evaluarNutrientes(nDia: Record<string, number>) {
  const micro = [...NUTRIENTES_GRUPOS[1].keys, ...NUTRIENTES_GRUPOS[2].keys];
  const ausentes: string[] = [];
  const insuficientes: string[] = [];
  micro.forEach((k) => {
    const val = nDia[k] || 0;
    const vdr = VDR_DIA[k] || 0;
    if (val <= 0) ausentes.push(k);
    else if (vdr && (val / vdr) * 100 < 50) insuficientes.push(k);
  });
  // Nutrientes con máximo recomendado (sodio/sal, azúcar, grasas saturadas)
  const excesos: string[] = [];
  VDR_MAX.forEach((k) => {
    const val = nDia[k] || 0;
    const vdr = VDR_DIA[k] || 0;
    if (vdr && (val / vdr) * 100 > 100) excesos.push(k);
  });
  return { ausentes, insuficientes, excesos, bajos: ausentes.length + insuficientes.length };
}

export default function CalendarioPedidos({
  grupoId,
  palabraSecreta,
  fechaInicio,
  fechaFin,
  miembros,
  items: itemsIniciales,
  platos,
  clienteActualId: clienteActualIdProp,
}: CalendarioPedidosProps) {
  const [items, setItems] = useState<ItemPedido[]>(itemsIniciales);
  const [modalAbierto, setModalAbierto] = useState<{ fecha: string; tipo: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [clienteActualId, setClienteActualId] = useState<string>(clienteActualIdProp);
  const [miembrosState, setMiembrosState] = useState<Miembro[]>(miembros);

  // Compartir grupo
  const [shareUrl, setShareUrl] = useState('');
  const [copiado, setCopiado] = useState<'url' | 'codigo' | null>(null);
  // Refresca el análisis nutricional cuando cambian las selecciones
  const [analisisVersion, setAnalisisVersion] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const copiar = async (texto: string, tipo: 'url' | 'codigo') => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* noop */
    }
  };

  // Estados del buscador (dentro del modal)
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [temperamentoFiltro, setTemperamentoFiltro] = useState<string>('');
  const [soloSinVenenos, setSoloSinVenenos] = useState(false);
  // Plato y vista (receta / científico / hildegardiano) desplegada en el modal
  const [vistaModal, setVistaModal] = useState<{ id: string; tipo: 'receta' | 'cientifico' | 'hildegardiano' } | null>(null);
  // Análisis por día desplegado (científico / hildegardiano) en el calendario
  const [analisisDia, setAnalisisDia] = useState<Record<string, 'cientifico' | 'hildegardiano' | null>>({});
  const toggleAnalisisDia = (fecha: string, tipo: 'cientifico' | 'hildegardiano') =>
    setAnalisisDia((prev) => ({ ...prev, [fecha]: prev[fecha] === tipo ? null : tipo }));
  // Informe del plan completo (rango del grupo) desplegable
  const [informeAbierto, setInformeAbierto] = useState(true);
  const [informeTab, setInformeTab] = useState<'cientifico' | 'hildegardiano' | null>(null);

  useEffect(() => {
    const clienteGuardado = localStorage.getItem('cliente_actual');
    if (clienteGuardado) {
      try {
        const cliente = JSON.parse(clienteGuardado);
        if (cliente.id) {
          setClienteActualId(cliente.id);
          console.log('✅ Cliente cargado desde localStorage:', cliente.id);
        }
      } catch (e) {
        console.error('❌ Error leyendo cliente del localStorage:', e);
      }
    } else {
      console.log('⚠️ No hay cliente en localStorage, usando:', clienteActualIdProp);
    }
  }, []);

  // Limpiar filtros cuando se cierra el modal
  useEffect(() => {
    if (!modalAbierto) {
      setTextoBusqueda('');
      setCategoriaFiltro(null);
      setTemperamentoFiltro('');
      setSoloSinVenenos(false);
      setVistaModal(null);
    }
  }, [modalAbierto]);

  const fechas = [];
  const inicio = parseFechaLocal(fechaInicio);
  const fin = parseFechaLocal(fechaFin);
  const actual = new Date(inicio);
  while (actual <= fin) {
    fechas.push(new Date(actual));
    actual.setDate(actual.getDate() + 1);
  }

  const getItem = (fecha: string, tipo: string) => {
    return items.find((item) => item.fecha === fecha && item.tipo_comida === tipo);
  };

  const getNombreCliente = (clienteId: string) => {
    const miembro = miembrosState.find((m) => m.cliente_id === clienteId);
    return miembro?.cliente.nombre || 'Desconocido';
  };

  // Análisis nutricional + hildegardiano de un plato (por porción)
  const analizarPlato = (plato: Plato) => {
    const receta = plato.receta;
    if (!receta || !receta.ingredientes || receta.ingredientes.length === 0) return null;

    const porciones = receta.porciones || 1;
    const n: Record<string, number> = {
      calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, grasas_saturadas: 0, fibra: 0, azucar: 0,
      sodio: 0, calcio: 0, hierro: 0, magnesio: 0, potasio: 0, zinc: 0, fosforo: 0,
      vitaminaA: 0, vitaminaC: 0, vitaminaD: 0, vitaminaE: 0, vitaminaK: 0,
      vitaminaB1: 0, vitaminaB2: 0, vitaminaB3: 0, vitaminaB5: 0, vitaminaB6: 0, vitaminaB9: 0, vitaminaB12: 0,
    };
    const temp: Record<string, number> = {};
    const venenos: string[] = [];
    const pilares = new Set<string>();
    let peso = 0;
    let subtilitatPond = 0;
    let pesoCocido = 0;
    let pesoCrudo = 0;

    receta.ingredientes.forEach((ri) => {
      const ing = ri.ingrediente;
      if (!ing) return;
      const gramos = normalizarAGramos(ri.cantidad || 0, ri.unidad || '') / porciones;
      const f = gramos / 100;

      n.calorias += (ing.calorias || 0) * f;
      n.proteinas += (ing.proteinas_g || 0) * f;
      n.carbohidratos += (ing.carbohidratos_g || 0) * f;
      n.grasas += (ing.grasas_g || 0) * f;
      n.grasas_saturadas += (ing.grasas_saturadas_g || 0) * f;
      n.fibra += (ing.fibra_g || 0) * f;
      n.azucar += (ing.azucar_g || 0) * f;
      n.sodio += (ing.sodio_mg || 0) * f;
      n.calcio += (ing.calcio_mg || 0) * f;
      n.hierro += (ing.hierro_mg || 0) * f;
      n.magnesio += (ing.magnesio_mg || 0) * f;
      n.potasio += (ing.potasio_mg || 0) * f;
      n.zinc += (ing.zinc_mg || 0) * f;
      n.fosforo += (ing.fosforo_mg || 0) * f;
      n.vitaminaA += (ing.vitamina_a_mcg || 0) * f;
      n.vitaminaC += (ing.vitamina_c_mg || 0) * f;
      n.vitaminaD += (ing.vitamina_d_mcg || 0) * f;
      n.vitaminaE += (ing.vitamina_e_mg || 0) * f;
      n.vitaminaK += (ing.vitamina_k_mcg || 0) * f;
      n.vitaminaB1 += (ing.vitamina_b1_mg || 0) * f;
      n.vitaminaB2 += (ing.vitamina_b2_mg || 0) * f;
      n.vitaminaB3 += (ing.vitamina_b3_mg || 0) * f;
      n.vitaminaB5 += (ing.vitamina_b5_mg || 0) * f;
      n.vitaminaB6 += (ing.vitamina_b6_mg || 0) * f;
      n.vitaminaB9 += (ing.vitamina_b9_mcg || 0) * f;
      n.vitaminaB12 += (ing.vitamina_b12_mcg || 0) * f;

      peso += gramos;
      subtilitatPond += (ing.nivel_subtilitat ?? 5) * gramos;
      if (ing.requiere_coccion) pesoCocido += gramos;
      else pesoCrudo += gramos;

      if (ing.temperamento) temp[ing.temperamento] = (temp[ing.temperamento] || 0) + (ing.calorias || 0) * f;
      if (ing.es_veneno_hildegardiano) venenos.push(ing.nombre);
      if (ing.es_base_alegria) pilares.add(obtenerPilarNombre(ing.nombre));
      else {
        const nl = ing.nombre.toLowerCase();
        PILARES_ALEGRIA.forEach((p) => {
          if (nl.includes(p)) pilares.add(obtenerPilarNombre(ing.nombre));
        });
      }
    });

    const calido = (temp.calido || 0) + (temp.calido_seco || 0) + (temp.calido_humedo || 0);
    const frio = (temp.frio || 0) + (temp.frio_seco || 0) + (temp.frio_humedo || 0);
    const seco = (temp.calido_seco || 0) + (temp.frio_seco || 0);
    const humedo = (temp.calido_humedo || 0) + (temp.frio_humedo || 0);
    const tot = calido + frio;
    const pesoTot = pesoCocido + pesoCrudo;

    // Evaluación por reglas hildegardianas (según nombres de ingredientes)
    const nombres = receta.ingredientes.map((ri) => ri.ingrediente?.nombre || '').filter(Boolean);
    const evaluacion = evaluarReceta(nombres);

    return {
      n,
      porcCalido: tot ? (calido / tot) * 100 : 0,
      porcFrio: tot ? (frio / tot) * 100 : 0,
      porcSeco: tot ? (seco / tot) * 100 : 0,
      porcHumedo: tot ? (humedo / tot) * 100 : 0,
      viriditas: peso ? subtilitatPond / peso : 0,
      porcCocido: pesoTot ? (pesoCocido / pesoTot) * 100 : 0,
      venenos,
      pilares: Array.from(pilares),
      evaluacion,
    };
  };

  // Análisis agregado de todos los platos seleccionados en un día.
  // Se recalcula automáticamente cuando cambian las selecciones (items).
  const analizarDia = (fechaStr: string) => {
    const itemsDia = items.filter((it) => it.fecha === fechaStr);
    if (itemsDia.length === 0) return null;

    const n: Record<string, number> = {};
    NUTRIENTES_LISTA.forEach((nut) => {
      n[nut.key] = 0;
    });

    let calCalido = 0;
    let calFrio = 0;
    let calTot = 0;
    let sumViriditas = 0;
    let sumCocido = 0;
    let sumSeco = 0;
    let sumHumedo = 0;
    let sumPuntaje = 0;
    let platosAnalizados = 0;
    const venenos = new Set<string>();
    const pilares = new Set<string>();

    itemsDia.forEach((it) => {
      const plato = platos.find((p) => p.id === it.plato_id);
      if (!plato) return;
      const a = analizarPlato(plato);
      if (!a) return;
      platosAnalizados++;
      NUTRIENTES_LISTA.forEach((nut) => {
        n[nut.key] += a.n[nut.key] || 0;
      });
      const cal = a.n.calorias || 0;
      calCalido += a.porcCalido * cal;
      calFrio += a.porcFrio * cal;
      calTot += cal;
      sumViriditas += a.viriditas;
      sumCocido += a.porcCocido;
      sumSeco += a.porcSeco;
      sumHumedo += a.porcHumedo;
      sumPuntaje += a.evaluacion.puntaje;
      a.venenos.forEach((v) => venenos.add(v));
      a.pilares.forEach((p) => pilares.add(p));
    });

    if (platosAnalizados === 0) return null;

    return {
      totalItems: itemsDia.length,
      platosAnalizados,
      n,
      porcCalido: calTot ? calCalido / calTot : 0,
      porcFrio: calTot ? calFrio / calTot : 0,
      viriditas: sumViriditas / platosAnalizados,
      porcCocido: sumCocido / platosAnalizados,
      porcSeco: sumSeco / platosAnalizados,
      porcHumedo: sumHumedo / platosAnalizados,
      puntaje: sumPuntaje / platosAnalizados,
      venenos: Array.from(venenos),
      pilares: Array.from(pilares),
    };
  };

  // Análisis agregado de TODO el rango elegido por el grupo (todos los platos del plan).
  // Usa la misma lógica que el análisis por día; se recalcula al cambiar cualquier plato.
  const analizarRango = () => {
    if (items.length === 0) return null;

    const n: Record<string, number> = {};
    NUTRIENTES_LISTA.forEach((nut) => {
      n[nut.key] = 0;
    });

    let calCalido = 0;
    let calFrio = 0;
    let calTot = 0;
    let sumViriditas = 0;
    let sumPuntaje = 0;
    let platosAnalizados = 0;
    const venenos = new Set<string>();
    const pilares = new Set<string>();

    items.forEach((it) => {
      const plato = platos.find((p) => p.id === it.plato_id);
      if (!plato) return;
      const a = analizarPlato(plato);
      if (!a) return;
      platosAnalizados++;
      NUTRIENTES_LISTA.forEach((nut) => {
        n[nut.key] += a.n[nut.key] || 0;
      });
      const cal = a.n.calorias || 0;
      calCalido += a.porcCalido * cal;
      calFrio += a.porcFrio * cal;
      calTot += cal;
      sumViriditas += a.viriditas;
      sumPuntaje += a.evaluacion.puntaje;
      a.venenos.forEach((v) => venenos.add(v));
      a.pilares.forEach((p) => pilares.add(p));
    });

    if (platosAnalizados === 0) return null;

    const dias = Math.max(fechas.length, 1);
    const nProm: Record<string, number> = {};
    NUTRIENTES_LISTA.forEach((nut) => {
      nProm[nut.key] = n[nut.key] / dias;
    });

    return {
      dias,
      platosAnalizados,
      n, // total del rango
      nProm, // promedio diario del plan
      porcCalido: calTot ? calCalido / calTot : 0,
      porcFrio: calTot ? calFrio / calTot : 0,
      viriditas: sumViriditas / platosAnalizados,
      puntaje: sumPuntaje / platosAnalizados,
      venenos: Array.from(venenos),
      pilares: Array.from(pilares),
    };
  };

  // 🔍 Función mejorada con filtros del buscador
  const getPlatosDisponibles = (fecha: string, tipo: string) => {
    const fechaObj = parseFechaLocal(fecha);
    const diaSemana = fechaObj.getDay() === 0 ? 7 : fechaObj.getDay();
    const tipoInfo = TIPOS_COMIDA.find((t) => t.id === tipo);
    if (!tipoInfo) return [];

    return platos.filter((plato) => {
      // Filtro base: categoría y día
      if (plato.categoria_id !== tipoInfo.categoriaId) return false;
      if (!plato.disponible_todos_dias && plato.dia_semana_id !== null && plato.dia_semana_id !== diaSemana) {
        return false;
      }

      // Filtro por texto (nombre, descripción o ingrediente)
      if (textoBusqueda) {
        const texto = textoBusqueda.toLowerCase();
        const coincideNombre = plato.nombre.toLowerCase().includes(texto);
        const coincideDesc = plato.descripcion?.toLowerCase().includes(texto) || false;
        const coincideIngrediente = plato.receta?.ingredientes?.some(ri =>
          ri.ingrediente.nombre.toLowerCase().includes(texto)
        ) || false;
        if (!coincideNombre && !coincideDesc && !coincideIngrediente) return false;
      }

      // Filtro por categoría adicional
      if (categoriaFiltro && plato.categoria_id !== categoriaFiltro) return false;

      // Filtro por temperamento
      if (temperamentoFiltro && plato.receta?.ingredientes) {
        const tieneTemperamento = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.temperamento === temperamentoFiltro
        );
        if (!tieneTemperamento) return false;
      }

      // Filtro sin venenos
      if (soloSinVenenos && plato.receta?.ingredientes) {
        const tieneVeneno = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.es_veneno_hildegardiano
        );
        if (tieneVeneno) return false;
      }

      return true;
    });
  };

  const seleccionarPlato = async (fecha: string, tipo: string, platoId: string) => {
    setCargando(true);
    setMensaje('');

    try {
      const plato = platos.find((p) => p.id === platoId);
      if (!plato) {
        throw new Error('Plato no encontrado');
      }

      const response = await fetch(`/api/grupos/${grupoId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteActualId,
          fecha,
          tipo_comida: tipo,
          plato_id: platoId,
          cantidad: 1,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Respuesta inválida del servidor');
      }

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      const itemConPlato = {
        ...data.item,
        plato: plato,
      };

      const nuevosItems = items.filter(
        (item) => !(item.fecha === fecha && item.tipo_comida === tipo)
      );
      nuevosItems.push(itemConPlato);
      setItems(nuevosItems);
      setAnalisisVersion((v) => v + 1);

      setModalAbierto(null);
      setMensaje(`✅ ${plato.nombre} seleccionado para ${new Date(fecha).toLocaleDateString('es-AR')}`);
      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const confirmarGeneral = async () => {
    setCargando(true);
    setMensaje('');

    try {
      const response = await fetch(`/api/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'confirmar',
          cliente_id: clienteActualId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al confirmar');
      }

      const data = await response.json();
      setMensaje(data.mensaje);

      setMiembrosState((prev) =>
        prev.map((m) =>
          m.cliente_id === clienteActualId ? { ...m, confirmado_general: true } : m
        )
      );

      setTimeout(() => setMensaje(''), 5000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const total = items.reduce((sum, item) => {
    const plato = platos.find((p) => p.id === item.plato_id);
    return sum + (plato?.precio || 0) * item.cantidad;
  }, 0);

  const clienteActual = miembrosState.find((m) => m.cliente_id === clienteActualId);
  const miembrosConfirmados = miembrosState.filter((m) => m.confirmado_general).length;
  const miembrosConfirmadosLista = miembrosState.filter((m) => m.confirmado_general);
  const miembrosPendientes = miembrosState.filter((m) => !m.confirmado_general);
  const todosConfirmaron = miembrosConfirmados === miembrosState.length && miembrosState.length === 4;

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-emerald-50">
      <header className="bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-teal-100 text-xs font-semibold uppercase tracking-wide">🔑 Código para unirse</p>
          <h1 className="text-3xl font-bold font-serif tracking-widest">{palabraSecreta}</h1>
          <p className="text-teal-100 mt-2 text-sm">
            📅 Desde{' '}
            <strong>
              {parseFechaLocal(fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
            </strong>{' '}
            hasta{' '}
            <strong>
              {parseFechaLocal(fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
            </strong>{' '}
            · {fechas.length} días · {miembrosState.length}/4 miembros
          </p>
          <p className="text-teal-100 mt-1 text-sm">
            {miembrosConfirmadosLista.length > 0 && (
              <>✅ Confirmaron: {miembrosConfirmadosLista.map((m) => m.cliente.nombre).join(', ')}</>
            )}
            {miembrosConfirmadosLista.length > 0 && miembrosPendientes.length > 0 && ' · '}
            {miembrosPendientes.length > 0 ? (
              <>⏳ Falta confirmar: {miembrosPendientes.map((m) => m.cliente.nombre).join(', ')}</>
            ) : (
              miembrosConfirmadosLista.length > 0 && ' · 🎉 ¡Todos confirmaron!'
            )}
          </p>
        </div>
      </header>

      {/* Compartir grupo */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        {(() => {
          const creador = miembrosState.find((m) => m.rol === 'creador')?.cliente.nombre || 'Desconocido';
          const rangoFechas =
            `${parseFechaLocal(fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}` +
            ` al ${parseFechaLocal(fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
          const mensajeCompartir =
            `¡Sumate a nuestro grupo para pedir comida en Bingen! 🍽️\n\n` +
            `👤 Creado por: ${creador}\n` +
            `📅 Plan: ${rangoFechas}\n\n` +
            `🔑 Código para unirse: ${palabraSecreta}\n\n` +
            `🔗 O entrá directo con este enlace:\n${shareUrl}`;

          return (
            <div className="bg-white rounded-xl shadow-md border-l-4 border-emerald-500 p-4">
              <h2 className="font-bold text-gray-800 mb-1">🔗 Invitá a tu grupo</h2>
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-semibold">📅 Plan:</span> {rangoFechas}
                {' · '}
                <span className="font-semibold">👤 Creado por:</span> {creador}
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Código para unirse</p>
                  <span className="text-2xl font-bold tracking-widest text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg inline-block">
                    {palabraSecreta}
                  </span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Enlace</p>
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>
              </div>

              <button
                onClick={() => copiar(mensajeCompartir, 'url')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg"
              >
                {copiado === 'url' ? '✅ Datos copiados' : '📤 Compartir (copiar datos)'}
              </button>
            </div>
          );
        })()}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <h2 className="font-bold text-gray-800 mb-3">👥 Miembros del Grupo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {miembrosState.map((miembro) => (
              <div
                key={miembro.id}
                className={`p-3 rounded-lg border-2 ${
                  miembro.confirmado_general
                    ? 'bg-green-50 border-green-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {miembro.confirmado_general ? '✅' : '⏳'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {miembro.cliente.nombre}
                      {miembro.cliente_id === clienteActualId && ' (Vos)'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {miembro.rol === 'creador' ? '👑 Creador' : '👤 Miembro'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
            {mensaje}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="space-y-4">
          {fechas.map((fecha) => {
            const fechaStr = formatFechaLocal(fecha);
            const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();
            const diaInfo = DIAS_SEMANA.find((d) => d.id === diaSemana);

            return (
              <div key={fechaStr} className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {diaInfo?.icono} {diaInfo?.nombre}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {fecha.toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-xs text-amber-700 font-semibold mt-1">
                      Tema: {diaInfo?.tematica}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {TIPOS_COMIDA.map((tipo) => {
                    const item = getItem(fechaStr, tipo.id);

                    return (
                      <button
                        key={tipo.id}
                        onClick={() => setModalAbierto({ fecha: fechaStr, tipo: tipo.id })}
                        disabled={cargando}
                        className={`p-3 rounded-lg text-left transition-all ${
                          item
                            ? 'bg-green-100 border-2 border-green-500 hover:bg-green-200'
                            : 'bg-gray-50 border-2 border-dashed border-gray-300 hover:border-amber-500 hover:bg-amber-50'
                        }`}
                      >
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          {tipo.icono} {tipo.label}
                        </p>
                        {item ? (
                          <>
                            <p className="text-sm font-bold text-gray-800">
                              {item.plato?.nombre || 'Cargando...'}
                            </p>
                            <p className="text-xs text-green-700 font-semibold mt-1">
                              ${item.plato?.precio.toLocaleString('es-AR')}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              👤 {getNombreCliente(item.seleccionado_por)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Click para seleccionar</p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 📊 Análisis nutricional del día (se actualiza al cambiar de plato) */}
                {(() => {
                  const ad = analizarDia(fechaStr);
                  if (!ad) return null;
                  const tab = analisisDia[fechaStr] || null;
                  const cal = ad.n.calorias || 0;
                  const prot = ad.n.proteinas || 0;
                  const metaCal = VDR_DIA.calorias;
                  const metaProt = VDR_DIA.proteinas;
                  const pctCal = metaCal ? (cal / metaCal) * 100 : 0;
                  const pctProt = metaProt ? (prot / metaProt) * 100 : 0;
                  const estCal = estadoMeta(cal, metaCal);
                  const estProt = estadoMeta(prot, metaProt);
                  // Veredicto hildegardiano resumido para la barra compacta
                  const estHild =
                    ad.puntaje >= 70
                      ? { emoji: '🟢', label: 'Muy equilibrado', bg: 'bg-green-100 text-green-800' }
                      : ad.puntaje >= 40
                      ? { emoji: '🟡', label: 'Aceptable', bg: 'bg-yellow-100 text-yellow-800' }
                      : { emoji: '🔴', label: 'Poco equilibrado', bg: 'bg-red-100 text-red-800' };
                  // Micronutrientes: ausentes, insuficientes y excesos
                  const { ausentes, insuficientes, excesos, bajos } = evaluarNutrientes(ad.n);
                  return (
                    <div className="mt-3 pt-3 border-t">
                      {/* Resumen compacto siempre visible */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-700">📊 Resumen del día:</span>
                        <span className={`rounded px-2 py-0.5 font-semibold ${estCal.bg}`}>
                          {estCal.emoji} Calorías: {estCal.label}
                        </span>
                        <span className={`rounded px-2 py-0.5 font-semibold ${estProt.bg}`}>
                          {estProt.emoji} Proteínas: {estProt.label}
                        </span>
                        {bajos > 0 ? (
                          <span className="bg-red-100 text-red-800 rounded px-2 py-0.5 font-semibold">
                            ⚠️ {bajos} vitaminas/minerales bajos
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-800 rounded px-2 py-0.5 font-semibold">
                            ✅ Vitaminas y minerales cubiertos
                          </span>
                        )}
                        {excesos.length > 0 && (
                          <span className="bg-orange-100 text-orange-800 rounded px-2 py-0.5 font-semibold">
                            ⚠️ Exceso de {excesos.map((k) => NUTRIENTE_META[k].l.toLowerCase()).join(', ')}
                          </span>
                        )}
                        <span className={`rounded px-2 py-0.5 font-semibold ${estHild.bg}`}>
                          🌿 Santa Hildegarda: {estHild.label}
                        </span>
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={() => toggleAnalisisDia(fechaStr, 'cientifico')}
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tab === 'cientifico' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            🔬 Científico
                          </button>
                          <button
                            onClick={() => toggleAnalisisDia(fechaStr, 'hildegardiano')}
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tab === 'hildegardiano' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            🌿 Hildegardiano
                          </button>
                        </div>
                      </div>

                      {/* Detalle científico del día: en lenguaje simple */}
                      {tab === 'cientifico' && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-3 space-y-3">
                          <p className="text-xs text-gray-600">
                            Esto es lo que aportan los platos elegidos para <strong>una persona en todo el día</strong>.
                          </p>

                          {/* Calorías y proteínas con lenguaje claro */}
                          {[
                            { l: 'Calorías', val: cal, meta: metaCal, u: 'kcal', pct: pctCal, est: estCal },
                            { l: 'Proteínas', val: prot, meta: metaProt, u: 'g', pct: pctProt, est: estProt },
                          ].map((g) => (
                            <div key={g.l} className="bg-white rounded-lg p-2 border border-blue-100">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-800">{g.l}</span>
                                <span className={`text-xs font-semibold rounded px-2 py-0.5 ${g.est.bg}`}>
                                  {g.est.emoji} {g.est.label}
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                                <div className={`h-full ${g.est.bar}`} style={{ width: `${Math.min(g.pct, 100)}%` }} />
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Aporta <strong>{g.val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} {g.u}</strong> de
                                los <strong>{g.meta} {g.u}</strong> recomendados por día — {vecesTexto(g.pct)}.
                              </p>
                            </div>
                          ))}

                          {/* Vitaminas y minerales */}
                          <div className="bg-white rounded-lg p-2 border border-blue-100">
                            <p className="text-sm font-bold text-gray-800 mb-1">🧪 Vitaminas y minerales</p>
                            {ausentes.length === 0 && insuficientes.length === 0 ? (
                              <p className="text-xs text-green-700">
                                ✅ El día cubre bien las vitaminas y minerales principales.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {ausentes.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-700 mb-1">
                                      Este día <strong>no incluye</strong>:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {ausentes.map((k) => (
                                        <span
                                          key={k}
                                          className="bg-red-100 text-red-800 rounded px-2 py-0.5 text-xs font-semibold"
                                        >
                                          {NUTRIENTE_META[k].l}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {insuficientes.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-700 mb-1">
                                      Incluye <strong>muy poca cantidad</strong> de (menos de la mitad de lo recomendado):
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {insuficientes.map((k) => (
                                        <span
                                          key={k}
                                          className="bg-yellow-100 text-yellow-800 rounded px-2 py-0.5 text-xs font-semibold"
                                        >
                                          {NUTRIENTE_META[k].l}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Nutrientes en exceso (sal, azúcar, grasas saturadas) */}
                          {excesos.length > 0 && (
                            <div className="bg-white rounded-lg p-2 border border-orange-200">
                              <p className="text-sm font-bold text-gray-800 mb-1">⚠️ En exceso</p>
                              <p className="text-xs text-gray-700 mb-1">
                                Este día tiene <strong>más de lo recomendado</strong> de:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {excesos.map((k) => (
                                  <span
                                    key={k}
                                    className="bg-orange-100 text-orange-800 rounded px-2 py-0.5 text-xs font-semibold"
                                  >
                                    {NUTRIENTE_META[k].l}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-500 mt-1">
                                Conviene no abusar de la sal (sodio), el azúcar y las grasas saturadas.
                              </p>
                            </div>
                          )}

                          <p className="text-[10px] text-gray-500">
                            Valores de referencia para un adulto promedio ({metaCal} kcal y {metaProt} g de proteína al día).
                            Pueden variar según edad, peso y actividad física.
                          </p>
                        </div>
                      )}

                      {/* Detalle hildegardiano del día: en lenguaje simple */}
                      {tab === 'hildegardiano' && (() => {
                        const verdicto =
                          ad.puntaje >= 70
                            ? { emoji: '🟢', label: 'Muy alineado con la alimentación de Santa Hildegarda', bg: 'bg-green-100 text-green-800' }
                            : ad.puntaje >= 40
                            ? { emoji: '🟡', label: 'Parcialmente alineado', bg: 'bg-yellow-100 text-yellow-800' }
                            : { emoji: '🔴', label: 'Poco alineado', bg: 'bg-red-100 text-red-800' };
                        const dif = ad.porcCalido - ad.porcFrio;
                        const tempTexto =
                          dif > 20
                            ? 'Predominan los alimentos que «calientan» el cuerpo 🔥. Ideal para días fríos o personas friolentas.'
                            : dif < -20
                            ? 'Predominan los alimentos que «refrescan» el cuerpo ❄️. Ideal para días calurosos.'
                            : 'Buen equilibrio entre alimentos que calientan 🔥 y que refrescan ❄️.';
                        const viridTexto =
                          ad.viriditas >= 7
                            ? 'Alta: abundan los alimentos frescos y llenos de energía vital.'
                            : ad.viriditas >= 4
                            ? 'Media: mezcla de alimentos frescos y elaborados.'
                            : 'Baja: predominan alimentos poco frescos o muy procesados.';
                        return (
                          <div className="mt-2 bg-emerald-50 rounded-lg p-3 space-y-3 text-xs text-gray-700">
                            <p className="text-xs text-gray-600">
                              Según la alimentación de <strong>Santa Hildegarda de Bingen</strong>, que busca el equilibrio
                              entre alimentos que «calientan» y «refrescan» el cuerpo.
                            </p>

                            {/* Veredicto general */}
                            <div className={`rounded-lg px-3 py-2 font-semibold ${verdicto.bg}`}>
                              {verdicto.emoji} {verdicto.label}
                            </div>

                            {/* ¿Calienta o refresca? */}
                            <div className="bg-white rounded-lg p-2 border border-emerald-100">
                              <p className="text-sm font-bold text-gray-800 mb-1">🌡️ ¿Calienta o refresca?</p>
                              {(ad.porcCalido > 0 || ad.porcFrio > 0) ? (
                                <div className="w-full h-5 rounded-full overflow-hidden flex bg-gray-100 mb-1">
                                  <div
                                    className="bg-orange-500 h-full flex items-center justify-center text-[10px] text-white font-semibold"
                                    style={{ width: `${ad.porcCalido}%` }}
                                  >
                                    {ad.porcCalido > 18 ? `🔥 ${ad.porcCalido.toFixed(0)}%` : ''}
                                  </div>
                                  <div
                                    className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-semibold"
                                    style={{ width: `${ad.porcFrio}%` }}
                                  >
                                    {ad.porcFrio > 18 ? `❄️ ${ad.porcFrio.toFixed(0)}%` : ''}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 mb-1">Sin datos suficientes.</p>
                              )}
                              <p className="text-xs text-gray-600">{tempTexto}</p>
                            </div>

                            {/* Frescura / energía vital */}
                            <div className="bg-white rounded-lg p-2 border border-emerald-100">
                              <p className="text-sm font-bold text-gray-800 mb-1">🌿 Frescura y energía vital</p>
                              <p className="text-xs text-gray-600">{viridTexto}</p>
                            </div>

                            {/* Pilares del bienestar y venenos */}
                            <div className="bg-white rounded-lg p-2 border border-emerald-100 space-y-1">
                              {ad.pilares.length > 0 && (
                                <p className="text-emerald-800 text-xs">
                                  <strong>✨ Incluye pilares del bienestar:</strong> {ad.pilares.join(', ')}.
                                </p>
                              )}
                              {ad.venenos.length > 0 ? (
                                <p className="text-red-700 text-xs">
                                  <strong>⚠️ Contiene ingredientes que Hildegarda desaconseja:</strong> {ad.venenos.join(', ')}.
                                </p>
                              ) : (
                                <p className="text-green-700 text-xs">✅ No contiene ingredientes desaconsejados.</p>
                              )}
                            </div>

                            <p className="text-[10px] text-gray-500">
                              Basado en los {ad.platosAnalizados} plato{ad.platosAnalizados > 1 ? 's' : ''} con receta del día. Se actualiza al cambiar de plato.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">💰 Resumen del Pedido</h2>
              <p className="text-sm text-gray-600 mt-1">
                {items.length} platos seleccionados · {miembrosConfirmados}/4 confirmaciones
              </p>
            </div>
            <p className="text-3xl font-bold text-amber-600">
              ${total.toLocaleString('es-AR')}
            </p>
          </div>

          <button
            onClick={confirmarGeneral}
            disabled={cargando || clienteActual?.confirmado_general || todosConfirmaron}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              clienteActual?.confirmado_general
                ? 'bg-green-500 text-white cursor-not-allowed'
                : todosConfirmaron
                ? 'bg-blue-500 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg disabled:opacity-50'
            }`}
          >
            {cargando
              ? '⏳ Confirmando...'
              : clienteActual?.confirmado_general
              ? '✅ Ya confirmaste tu acuerdo'
              : todosConfirmaron
              ? '🎉 ¡Todos confirmaron! Pedido enviado'
              : '✅ Confirmar que estoy de acuerdo con el menú'}
          </button>

          {todosConfirmaron && (
            <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-semibold">
                🎉 ¡Excelente! Los 4 miembros confirmaron el pedido.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Informe del plan completo (todo el rango del grupo, misma lógica que por día) */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {(() => {
          const dias = fechas.length;
          const desde = parseFechaLocal(fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
          const hasta = parseFechaLocal(fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
          const ar = analizarRango();
          return (
            <div className="bg-white rounded-xl shadow-md">
              <button
                onClick={() => setInformeAbierto((v) => !v)}
                className="w-full flex justify-between items-center gap-2 p-4 font-bold text-gray-800 text-left"
              >
                <span>🧪 Informe Nutricional completo ({dias} días) de {desde} a {hasta}</span>
                <span>{informeAbierto ? '▲' : '▼'}</span>
              </button>

              {informeAbierto && (
                <div className="p-4 pt-0">
                  {!ar ? (
                    <p className="text-sm text-gray-500">
                      Todavía no hay platos con receta seleccionados para analizar el plan.
                    </p>
                  ) : (() => {
                    const calProm = ar.nProm.calorias;
                    const protProm = ar.nProm.proteinas;
                    const estCal = estadoMeta(calProm, VDR_DIA.calorias);
                    const estProt = estadoMeta(protProm, VDR_DIA.proteinas);
                    const pctCal = VDR_DIA.calorias ? (calProm / VDR_DIA.calorias) * 100 : 0;
                    const pctProt = VDR_DIA.proteinas ? (protProm / VDR_DIA.proteinas) * 100 : 0;
                    const estHild =
                      ar.puntaje >= 70
                        ? { emoji: '🟢', label: 'Muy equilibrado', bg: 'bg-green-100 text-green-800' }
                        : ar.puntaje >= 40
                        ? { emoji: '🟡', label: 'Aceptable', bg: 'bg-yellow-100 text-yellow-800' }
                        : { emoji: '🔴', label: 'Poco equilibrado', bg: 'bg-red-100 text-red-800' };
                    // Micronutrientes evaluados sobre el PROMEDIO diario del plan
                    const { ausentes, insuficientes, excesos, bajos } = evaluarNutrientes(ar.nProm);
                    return (
                      <>
                        {/* Resumen compacto del plan (igual que el diario) */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-gray-700">📊 Resumen ({dias} días):</span>
                          <span className={`rounded px-2 py-0.5 font-semibold ${estCal.bg}`}>
                            {estCal.emoji} Calorías/día: {estCal.label}
                          </span>
                          <span className={`rounded px-2 py-0.5 font-semibold ${estProt.bg}`}>
                            {estProt.emoji} Proteínas/día: {estProt.label}
                          </span>
                          {bajos > 0 ? (
                            <span className="bg-red-100 text-red-800 rounded px-2 py-0.5 font-semibold">
                              ⚠️ {bajos} vitaminas/minerales bajos
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 rounded px-2 py-0.5 font-semibold">
                              ✅ Vitaminas y minerales cubiertos
                            </span>
                          )}
                          {excesos.length > 0 && (
                            <span className="bg-orange-100 text-orange-800 rounded px-2 py-0.5 font-semibold">
                              ⚠️ Exceso de {excesos.map((k) => NUTRIENTE_META[k].l.toLowerCase()).join(', ')}
                            </span>
                          )}
                          <span className={`rounded px-2 py-0.5 font-semibold ${estHild.bg}`}>
                            🌿 Santa Hildegarda: {estHild.label}
                          </span>
                          <div className="ml-auto flex gap-1">
                            <button
                              onClick={() => setInformeTab((t) => (t === 'cientifico' ? null : 'cientifico'))}
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                informeTab === 'cientifico' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`}
                            >
                              🔬 Científico
                            </button>
                            <button
                              onClick={() => setInformeTab((t) => (t === 'hildegardiano' ? null : 'hildegardiano'))}
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                informeTab === 'hildegardiano' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              🌿 Hildegardiano
                            </button>
                          </div>
                        </div>

                        {/* Detalle científico del plan (promedio diario) */}
                        {informeTab === 'cientifico' && (
                          <div className="mt-2 bg-blue-50 rounded-lg p-3 space-y-3">
                            <p className="text-xs text-gray-600">
                              Promedio por día a lo largo de los {dias} días del plan, para una persona.
                            </p>

                            {[
                              { l: 'Calorías', val: calProm, meta: VDR_DIA.calorias, u: 'kcal', pct: pctCal, est: estCal },
                              { l: 'Proteínas', val: protProm, meta: VDR_DIA.proteinas, u: 'g', pct: pctProt, est: estProt },
                            ].map((g) => (
                              <div key={g.l} className="bg-white rounded-lg p-2 border border-blue-100">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-gray-800">{g.l} (promedio diario)</span>
                                  <span className={`text-xs font-semibold rounded px-2 py-0.5 ${g.est.bg}`}>
                                    {g.est.emoji} {g.est.label}
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                                  <div className={`h-full ${g.est.bar}`} style={{ width: `${Math.min(g.pct, 100)}%` }} />
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  En promedio <strong>{g.val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} {g.u}</strong> por
                                  día de los <strong>{g.meta} {g.u}</strong> recomendados — {vecesTexto(g.pct)}.
                                </p>
                              </div>
                            ))}

                            <div className="bg-white rounded-lg p-2 border border-blue-100">
                              <p className="text-sm font-bold text-gray-800 mb-1">🧪 Vitaminas y minerales</p>
                              {ausentes.length === 0 && insuficientes.length === 0 ? (
                                <p className="text-xs text-green-700">
                                  ✅ El plan cubre bien las vitaminas y minerales principales.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {ausentes.length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-700 mb-1">
                                        En todo el plan <strong>nunca aparecen</strong>:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {ausentes.map((k) => (
                                          <span
                                            key={k}
                                            className="bg-red-100 text-red-800 rounded px-2 py-0.5 text-xs font-semibold"
                                          >
                                            {NUTRIENTE_META[k].l}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {insuficientes.length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-700 mb-1">
                                        En promedio hay <strong>muy poca cantidad</strong> de (menos de la mitad de lo recomendado):
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {insuficientes.map((k) => (
                                          <span
                                            key={k}
                                            className="bg-yellow-100 text-yellow-800 rounded px-2 py-0.5 text-xs font-semibold"
                                          >
                                            {NUTRIENTE_META[k].l}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Nutrientes en exceso en promedio (sal, azúcar, grasas saturadas) */}
                            {excesos.length > 0 && (
                              <div className="bg-white rounded-lg p-2 border border-orange-200">
                                <p className="text-sm font-bold text-gray-800 mb-1">⚠️ En exceso</p>
                                <p className="text-xs text-gray-700 mb-1">
                                  En promedio, el plan tiene <strong>más de lo recomendado</strong> de:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {excesos.map((k) => (
                                    <span
                                      key={k}
                                      className="bg-orange-100 text-orange-800 rounded px-2 py-0.5 text-xs font-semibold"
                                    >
                                      {NUTRIENTE_META[k].l}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Conviene no abusar de la sal (sodio), el azúcar y las grasas saturadas.
                                </p>
                              </div>
                            )}

                            <p className="text-[10px] text-gray-500">
                              Referencia para un adulto promedio ({VDR_DIA.calorias} kcal y {VDR_DIA.proteinas} g de
                              proteína al día). Basado en {ar.platosAnalizados} plato{ar.platosAnalizados > 1 ? 's' : ''} con receta.
                            </p>
                          </div>
                        )}

                        {/* Detalle hildegardiano del plan */}
                        {informeTab === 'hildegardiano' && (() => {
                          const verdicto =
                            ar.puntaje >= 70
                              ? { emoji: '🟢', label: 'Muy alineado con la alimentación de Santa Hildegarda', bg: 'bg-green-100 text-green-800' }
                              : ar.puntaje >= 40
                              ? { emoji: '🟡', label: 'Parcialmente alineado', bg: 'bg-yellow-100 text-yellow-800' }
                              : { emoji: '🔴', label: 'Poco alineado', bg: 'bg-red-100 text-red-800' };
                          const dif = ar.porcCalido - ar.porcFrio;
                          const tempTexto =
                            dif > 20
                              ? 'El plan predomina en alimentos que «calientan» el cuerpo 🔥. Ideal para épocas frías.'
                              : dif < -20
                              ? 'El plan predomina en alimentos que «refrescan» el cuerpo ❄️. Ideal para épocas calurosas.'
                              : 'El plan mantiene un buen equilibrio entre alimentos que calientan 🔥 y que refrescan ❄️.';
                          const viridTexto =
                            ar.viriditas >= 7
                              ? 'Alta: el plan abunda en alimentos frescos y llenos de energía vital.'
                              : ar.viriditas >= 4
                              ? 'Media: mezcla de alimentos frescos y elaborados.'
                              : 'Baja: predominan alimentos poco frescos o muy procesados.';
                          return (
                            <div className="mt-2 bg-emerald-50 rounded-lg p-3 space-y-3 text-xs text-gray-700">
                              <p className="text-xs text-gray-600">
                                Según la alimentación de <strong>Santa Hildegarda de Bingen</strong>, en todo el plan.
                              </p>

                              <div className={`rounded-lg px-3 py-2 font-semibold ${verdicto.bg}`}>
                                {verdicto.emoji} {verdicto.label}
                              </div>

                              <div className="bg-white rounded-lg p-2 border border-emerald-100">
                                <p className="text-sm font-bold text-gray-800 mb-1">🌡️ ¿Calienta o refresca?</p>
                                {(ar.porcCalido > 0 || ar.porcFrio > 0) ? (
                                  <div className="w-full h-5 rounded-full overflow-hidden flex bg-gray-100 mb-1">
                                    <div
                                      className="bg-orange-500 h-full flex items-center justify-center text-[10px] text-white font-semibold"
                                      style={{ width: `${ar.porcCalido}%` }}
                                    >
                                      {ar.porcCalido > 18 ? `🔥 ${ar.porcCalido.toFixed(0)}%` : ''}
                                    </div>
                                    <div
                                      className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-semibold"
                                      style={{ width: `${ar.porcFrio}%` }}
                                    >
                                      {ar.porcFrio > 18 ? `❄️ ${ar.porcFrio.toFixed(0)}%` : ''}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 mb-1">Sin datos suficientes.</p>
                                )}
                                <p className="text-xs text-gray-600">{tempTexto}</p>
                              </div>

                              <div className="bg-white rounded-lg p-2 border border-emerald-100">
                                <p className="text-sm font-bold text-gray-800 mb-1">🌿 Frescura y energía vital</p>
                                <p className="text-xs text-gray-600">{viridTexto}</p>
                              </div>

                              <div className="bg-white rounded-lg p-2 border border-emerald-100 space-y-1">
                                {ar.pilares.length > 0 && (
                                  <p className="text-emerald-800 text-xs">
                                    <strong>✨ Incluye pilares del bienestar:</strong> {ar.pilares.join(', ')}.
                                  </p>
                                )}
                                {ar.venenos.length > 0 ? (
                                  <p className="text-red-700 text-xs">
                                    <strong>⚠️ Contiene ingredientes que Hildegarda desaconseja:</strong> {ar.venenos.join(', ')}.
                                  </p>
                                ) : (
                                  <p className="text-green-700 text-xs">✅ No contiene ingredientes desaconsejados.</p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* MODAL DE SELECCIÓN DE PLATOS CON BUSCADOR */}
      {modalAbierto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalAbierto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-700 to-orange-600 text-white p-6 rounded-t-2xl z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    Seleccioná {TIPOS_COMIDA.find((t) => t.id === modalAbierto.tipo)?.label}
                  </h2>
                  <p className="text-amber-100 mt-1">
                    {new Date(modalAbierto.fecha).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setModalAbierto(null)}
                  className="text-white hover:text-amber-200 text-3xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 🔍 BUSCADOR INTEGRADO */}
            <div className="sticky top-[120px] bg-amber-50 border-b border-amber-200 p-4 z-10">
              {/* Barra de búsqueda */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={textoBusqueda}
                    onChange={(e) => setTextoBusqueda(e.target.value)}
                    placeholder="🔍 Buscar por nombre o ingrediente..."
                    className="w-full px-4 py-2 pl-10 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>
                {hayFiltros && (
                  <button
                    onClick={() => {
                      setTextoBusqueda('');
                      setCategoriaFiltro(null);
                      setTemperamentoFiltro('');
                      setSoloSinVenenos(false);
                    }}
                    className="bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-semibold border border-gray-300"
                  >
                    ✖️ Limpiar
                  </button>
                )}
              </div>

              {/* Filtros rápidos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={categoriaFiltro || ''}
                  onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white text-gray-900"
                >
                  <option value="">📂 Todas las categorías</option>
                  {CATEGORIAS_FILTRO.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={temperamentoFiltro}
                  onChange={(e) => setTemperamentoFiltro(e.target.value)}
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white text-gray-900"
                >
                  <option value="">🌿 Todos los temperamentos</option>
                  {TEMPERAMENTOS.map((temp) => (
                    <option key={temp.valor} value={temp.valor}>
                      {temp.nombre}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 px-3 py-2 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 bg-white">
                  <input
                    type="checkbox"
                    checked={soloSinVenenos}
                    onChange={(e) => setSoloSinVenenos(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">🚫 Sin venenos</span>
                </label>
              </div>

              {/* Resumen de resultados */}
              <div className="mt-2 text-xs text-amber-800">
                Mostrando <strong>{getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).length}</strong> platos disponibles
              </div>
            </div>

            {/* Lista de platos */}
            <div className="p-6">
              {getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">😕 No hay platos con estos filtros</p>
                  <button
                    onClick={() => {
                      setTextoBusqueda('');
                      setCategoriaFiltro(null);
                      setTemperamentoFiltro('');
                      setSoloSinVenenos(false);
                    }}
                    className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 text-sm font-semibold"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).map((plato) => {
                    const vista = vistaModal?.id === plato.id ? vistaModal.tipo : null;
                    const abrir = (tipo: 'receta' | 'cientifico' | 'hildegardiano') =>
                      setVistaModal(vista === tipo ? null : { id: plato.id, tipo });
                    const a = vista === 'cientifico' || vista === 'hildegardiano' ? analizarPlato(plato) : null;
                    return (
                      <div key={plato.id} className="p-4 border-2 border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{plato.nombre}</h3>
                            <p className="text-sm text-gray-600 mt-1">{plato.descripcion}</p>
                            {plato.alergenos && plato.alergenos.length > 0 && (
                              <p className="text-xs text-red-600 mt-2">⚠️ {plato.alergenos.join(', ')}</p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-amber-600 whitespace-nowrap">
                            ${plato.precio.toLocaleString('es-AR')}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                          <button
                            onClick={() => seleccionarPlato(modalAbierto.fecha, modalAbierto.tipo, plato.id)}
                            disabled={cargando}
                            className="bg-amber-500 text-white font-semibold py-2 rounded-lg text-xs sm:text-sm hover:bg-amber-600 disabled:opacity-50"
                          >
                            ✅ Seleccionar
                          </button>
                          {plato.receta && (
                            <button
                              onClick={() => abrir('receta')}
                              className={`font-semibold py-2 rounded-lg text-xs sm:text-sm ${vista === 'receta' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                              📖 Receta
                            </button>
                          )}
                          {plato.receta && (
                            <button
                              onClick={() => abrir('cientifico')}
                              className={`font-semibold py-2 rounded-lg text-xs sm:text-sm ${vista === 'cientifico' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                            >
                              🔬 Científico
                            </button>
                          )}
                          {plato.receta && (
                            <button
                              onClick={() => abrir('hildegardiano')}
                              className={`font-semibold py-2 rounded-lg text-xs sm:text-sm ${vista === 'hildegardiano' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                            >
                              🌿 Hildegardiano
                            </button>
                          )}
                        </div>

                        {/* Sección: Receta */}
                        {vista === 'receta' && plato.receta && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-2">
                              {plato.receta.porciones ? `${plato.receta.porciones} porciones` : ''}
                              {plato.receta.tiempo_min ? ` · ${plato.receta.tiempo_min} min` : ''}
                              {plato.receta.dificultad ? ` · ${plato.receta.dificultad}` : ''}
                            </p>
                            {plato.receta.ingredientes && plato.receta.ingredientes.length > 0 && (
                              <>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Ingredientes</p>
                                <ul className="text-xs text-gray-700 space-y-0.5 mb-2">
                                  {plato.receta.ingredientes.map((ri, i) => (
                                    <li key={i} className="flex justify-between gap-2">
                                      <span>
                                        {ri.ingrediente?.nombre}
                                        {ri.ingrediente?.es_veneno_hildegardiano && (
                                          <span className="text-red-600 ml-1" title="Veneno hildegardiano">⚠️</span>
                                        )}
                                      </span>
                                      {(ri.cantidad || ri.unidad) && (
                                        <span className="text-gray-500 whitespace-nowrap">{ri.cantidad} {ri.unidad}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {plato.receta.pasos && plato.receta.pasos.length > 0 && (
                              <>
                                <p className="text-xs font-semibold text-gray-700 mb-1">Preparación</p>
                                <ol className="text-xs text-gray-700 list-decimal list-inside space-y-0.5">
                                  {plato.receta.pasos.map((paso, i) => (
                                    <li key={i}>{paso}</li>
                                  ))}
                                </ol>
                              </>
                            )}
                            {plato.receta.notas_hildegardianas && (
                              <p className="text-xs text-emerald-700 mt-2 italic">🌿 {plato.receta.notas_hildegardianas}</p>
                            )}
                          </div>
                        )}

                        {/* Sección: Análisis científico completo (por porción) */}
                        {vista === 'cientifico' && a && (
                          <div className="mt-3 bg-blue-50 rounded-lg p-3 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-700">🔬 Análisis nutricional científico</p>
                              <p className="text-[11px] text-gray-500">
                                Valores estimados por porción
                                {plato.receta?.porciones ? ` · rinde ${plato.receta.porciones} porciones` : ''}
                                {plato.receta?.tiempo_min ? ` · ${plato.receta.tiempo_min} min` : ''}
                                {plato.receta?.dificultad ? ` · ${plato.receta.dificultad}` : ''}
                              </p>
                            </div>

                            {/* Resumen rápido de macronutrientes */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { k: 'calorias', l: 'Calorías', u: 'kcal', c: 'text-orange-600' },
                                { k: 'proteinas', l: 'Proteínas', u: 'g', c: 'text-red-600' },
                                { k: 'carbohidratos', l: 'Carbohid.', u: 'g', c: 'text-amber-600' },
                                { k: 'grasas', l: 'Grasas', u: 'g', c: 'text-yellow-600' },
                              ].map((m) => (
                                <div key={m.k} className="bg-white rounded-lg p-2 text-center border border-blue-100">
                                  <p className={`text-base font-bold ${m.c}`}>
                                    {(a.n[m.k] || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                  </p>
                                  <p className="text-[10px] text-gray-500">{m.l} ({m.u})</p>
                                </div>
                              ))}
                            </div>

                            {/* Tablas agrupadas con barra de % VDR */}
                            {NUTRIENTES_GRUPOS.map((grupo) => (
                              <div key={grupo.titulo}>
                                <p className="text-[11px] font-bold text-gray-700 mb-1 mt-1">
                                  {grupo.icono} {grupo.titulo}
                                </p>
                                <div className="overflow-x-auto -mx-1 px-1">
                                  <table className="w-full text-xs text-gray-800">
                                    <tbody>
                                      {grupo.keys.map((key) => {
                                        const meta = NUTRIENTE_META[key];
                                        const val = a.n[key] || 0;
                                        const vdr = VDR_DIA[key] || 0;
                                        const pct = vdr ? (val / vdr) * 100 : 0;
                                        const esMax = VDR_MAX.has(key);
                                        const barColor = esMax
                                          ? pct > 100
                                            ? 'bg-red-500'
                                            : 'bg-yellow-500'
                                          : pct >= 50
                                          ? 'bg-green-500'
                                          : pct >= 20
                                          ? 'bg-blue-500'
                                          : 'bg-gray-300';
                                        return (
                                          <tr key={key} className="border-b border-gray-200 last:border-0">
                                            <td className="py-1 pr-2 text-gray-700 w-1/3">{meta.l}</td>
                                            <td className="py-1 pr-2 whitespace-nowrap font-semibold text-gray-900 w-1/4">
                                              {val.toLocaleString('es-AR', { maximumFractionDigits: 1 })} {meta.u}
                                            </td>
                                            <td className="py-1">
                                              <div className="flex items-center gap-1">
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
                                                  <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                </div>
                                                <span className="text-[10px] text-gray-600 whitespace-nowrap w-10 text-right">
                                                  {pct.toFixed(0)}%{esMax ? '*' : ''}
                                                </span>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}

                            <p className="text-[10px] text-gray-500 border-t border-blue-200 pt-2">
                              % VDR = porcentaje del valor diario recomendado (dieta de referencia de 2000 kcal).
                              <br />* = límite máximo recomendado (conviene no superarlo).
                            </p>
                          </div>
                        )}

                        {/* Sección: Análisis hildegardiano completo (por porción) */}
                        {vista === 'hildegardiano' && a && (
                          <div className="mt-3 bg-emerald-50 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-700">🌿 Análisis hildegardiano (por porción)</p>

                            {/* Interpretación editorial (cargada por el admin) */}
                            {plato.receta?.interpretacion_hildegardiana && (
                              <div className="bg-white border border-emerald-200 rounded-lg p-3 text-[11px] text-gray-700 whitespace-pre-line">
                                {plato.receta.interpretacion_hildegardiana}
                              </div>
                            )}

                            {/* Veredicto según reglas */}
                            <div
                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                a.evaluacion.nivel === 'no_hildegardiano'
                                  ? 'bg-red-100 text-red-800'
                                  : a.evaluacion.nivel === 'con_precaucion'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : a.evaluacion.nivel === 'excelente'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {a.evaluacion.veredicto} · {a.evaluacion.puntaje}/100
                            </div>

                            {(a.porcCalido > 0 || a.porcFrio > 0) ? (
                              <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100">
                                <div className="bg-orange-500 h-full flex items-center justify-center text-[9px] text-white" style={{ width: `${a.porcCalido}%` }}>
                                  {a.porcCalido > 15 ? `🔥 ${a.porcCalido.toFixed(0)}%` : ''}
                                </div>
                                <div className="bg-blue-500 h-full flex items-center justify-center text-[9px] text-white" style={{ width: `${a.porcFrio}%` }}>
                                  {a.porcFrio > 15 ? `❄️ ${a.porcFrio.toFixed(0)}%` : ''}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-400">Sin datos de temperamento</p>
                            )}
                            <p className="text-[11px] font-semibold text-gray-700 mt-1">📊 Cualidades del plato</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-700">
                              <span>🟢 Viriditas: <strong>{a.viriditas.toFixed(1)}</strong>/10</span>
                              <span>🔥 Cocido: <strong>{a.porcCocido.toFixed(0)}%</strong></span>
                              <span>☀️ Seco: <strong>{a.porcSeco.toFixed(0)}%</strong></span>
                              <span>💧 Húmedo: <strong>{a.porcHumedo.toFixed(0)}%</strong></span>
                            </div>
                            <p className="text-[10px] text-gray-500">
                              Viriditas = fuerza vital / frescura del alimento (0 a 10). El equilibrio 🔥/❄️ indica si el plato «calienta» o «enfría» según Hildegarda.
                            </p>

                            {/* Pilares de vigor (reglas por nombre) */}
                            {a.evaluacion.pilares.length > 0 && (
                              <div className="text-[11px] text-emerald-800">
                                <p className="font-semibold">✨ Pilares de vigor:</p>
                                <ul className="list-disc list-inside">
                                  {a.evaluacion.pilares.map((p, i) => (
                                    <li key={i}><strong>{p.nombre}</strong>: {p.razon}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Venenos de cocina */}
                            {a.evaluacion.venenos.length > 0 ? (
                              <div className="text-[11px] text-red-700">
                                <p className="font-semibold">🚫 Venenos de cocina:</p>
                                <ul className="list-disc list-inside">
                                  {a.evaluacion.venenos.map((v, i) => (
                                    <li key={i}><strong>{v.nombre}</strong>: {v.razon}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-[11px] text-green-700">✅ Sin venenos de cocina</p>
                            )}

                            {/* Precauciones */}
                            {a.evaluacion.precauciones.length > 0 && (
                              <div className="text-[11px] text-yellow-800">
                                <p className="font-semibold">⚠️ Usar con precaución:</p>
                                <ul className="list-disc list-inside">
                                  {a.evaluacion.precauciones.map((p, i) => (
                                    <li key={i}><strong>{p.nombre}</strong>: {p.motivo}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Especias cálidas */}
                            {a.evaluacion.especiasCalidas.length > 0 && (
                              <p className="text-[11px] text-amber-800">
                                🌶️ Especias cálidas (calientan el "frío interior"): {a.evaluacion.especiasCalidas.join(', ')}
                              </p>
                            )}

                            {/* Recomendaciones */}
                            {a.evaluacion.recomendaciones.length > 0 && (
                              <div className="text-[11px] text-gray-700 border-t border-emerald-200 pt-2">
                                <p className="font-semibold mb-1">📋 Recomendaciones:</p>
                                <ul className="space-y-0.5">
                                  {a.evaluacion.recomendaciones.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Cualidades por ingrediente (todos los datos de la BD) */}
                            {plato.receta?.ingredientes && plato.receta.ingredientes.length > 0 && (
                              <div className="border-t border-emerald-200 pt-2">
                                <p className="text-[11px] font-semibold text-gray-700 mb-1">🧾 Cualidades por ingrediente</p>
                                <div className="overflow-x-auto -mx-1 px-1">
                                  <table className="w-full text-[11px] text-gray-800 min-w-[340px]">
                                    <thead>
                                      <tr className="text-left text-gray-600 border-b border-emerald-300">
                                        <th className="py-1 pr-2 font-semibold">Ingrediente</th>
                                        <th className="py-1 pr-2 font-semibold">Temperamento</th>
                                        <th className="py-1 pr-2 font-semibold">Sutileza</th>
                                        <th className="py-1 font-semibold">Notas</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {plato.receta.ingredientes.map((ri, i) => {
                                        const ing = ri.ingrediente;
                                        if (!ing) return null;
                                        return (
                                          <tr key={i} className="border-b border-emerald-100 last:border-0 align-top">
                                            <td className="py-1 pr-2 text-gray-800">{ing.nombre}</td>
                                            <td className="py-1 pr-2 whitespace-nowrap">{temperamentoLabel(ing.temperamento)}</td>
                                            <td className="py-1 pr-2 whitespace-nowrap">
                                              {ing.nivel_subtilitat != null ? `${ing.nivel_subtilitat}/10` : '—'}
                                            </td>
                                            <td className="py-1">
                                              <div className="flex flex-wrap gap-1">
                                                {ing.es_base_alegria && (
                                                  <span className="bg-green-100 text-green-800 rounded px-1">✨ Alegría</span>
                                                )}
                                                {ing.es_veneno_hildegardiano && (
                                                  <span className="bg-red-100 text-red-800 rounded px-1">🚫 Veneno</span>
                                                )}
                                                {ing.requiere_coccion ? (
                                                  <span className="bg-orange-100 text-orange-800 rounded px-1">🔥 Cocción</span>
                                                ) : (
                                                  <span className="bg-blue-100 text-blue-800 rounded px-1">🥗 Crudo</span>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Sutileza (subtilitas) = qué tan «fino» o digerible es el alimento (0 a 10). ✨ Alegría = pilar del bienestar; 🚫 Veneno = ingrediente que Hildegarda desaconseja.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DIAS_SEMANA, CATEGORIAS_COMIDA } from '@/lib/pedidos';
import { evaluarHildegardianoDB, normalizarAGramos, estimarPorciones } from '@/lib/analisis-plato';
import ProduccionPorDia from '@/app/admin/pedidos/grupos/[id]/ProduccionPorDia';

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

// Convierte un paso de receta (string u objeto {descripcion/texto/paso/...}) en texto legible
function textoDePaso(p: any): string {
  if (typeof p === 'string') return p;
  if (!p || typeof p !== 'object') return String(p ?? '');
  return (
    p.descripcion ||
    p.texto ||
    p.paso_texto ||
    (typeof p.paso === 'string' ? p.paso : '') ||
    ''
  );
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
  imagen?: string | null;
  categoria_id: number;
  dia_semana_id: number | null;
  disponible_todos_dias: boolean;
  dias_semana?: number[];
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
  clienteActualId: string | null;
  clienteNombre?: string;
  clienteEmail?: string;
  esAdminViewer?: boolean;
  esAutenticado?: boolean;
  hoyServidor: string;
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
  if (pct >= 130) return { emoji: '🔴', label: 'Exceso', bg: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200', bar: 'bg-red-500' };
  if (pct >= 90) return { emoji: '🟢', label: 'Adecuado', bg: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200', bar: 'bg-green-500' };
  if (pct >= 60) return { emoji: '🟡', label: 'Bajo', bg: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200', bar: 'bg-yellow-500' };
  return { emoji: '🟠', label: 'Muy bajo', bg: 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200', bar: 'bg-orange-500' };
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
  platos: platosIniciales,
  clienteActualId: clienteActualIdProp,
  clienteNombre = '',
  clienteEmail = '',
  esAdminViewer = false,
  esAutenticado = false,
  hoyServidor,
}: CalendarioPedidosProps) {
  const router = useRouter();
  const [items, setItems] = useState<ItemPedido[]>(itemsIniciales);
  const [platosState, setPlatosState] = useState<Plato[]>(platosIniciales);
  const [modalAbierto, setModalAbierto] = useState<{ fecha: string; tipo: string } | null>(null);
  const [diaALimpiar, setDiaALimpiar] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [clienteActualId, setClienteActualId] = useState<string | null>(clienteActualIdProp);
  const [miembrosState, setMiembrosState] = useState<Miembro[]>(miembros);
  const [hidratado, setHidratado] = useState(false);

  // Unirse al grupo con el código (si el usuario aún no es miembro)
  const [codigoUnirse, setCodigoUnirse] = useState('');
  const [uniendo, setUniendo] = useState(false);

  // Compartir grupo
  const [shareUrl, setShareUrl] = useState('');
  const [copiado, setCopiado] = useState<'url' | 'codigo' | null>(null);
  // Refresca el análisis nutricional cuando cambian las selecciones
  const [analisisVersion, setAnalisisVersion] = useState(0);
  const platos = platosState;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    let activo = true;

    const refrescarGrupo = async () => {
      try {
        const cv = Date.now();
        const res = await fetch(`/api/grupos/${grupoId}?cv=${cv}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!activo) return;

        if (Array.isArray(data?.miembros)) {
          setMiembrosState(data.miembros);
        }
        if (Array.isArray(data?.items)) {
          setItems(data.items);
        }
        if (Array.isArray(data?.platos)) {
          setPlatosState(data.platos);
        }
      } catch {
        // noop
      }
    };

    const onFocus = () => {
      refrescarGrupo();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refrescarGrupo();
      }
    };

    refrescarGrupo();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(refrescarGrupo, 15000);

    return () => {
      activo = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [grupoId]);

  useEffect(() => {
    setHidratado(true);
  }, []);

  const copiar = async (texto: string, tipo: 'url' | 'codigo') => {
    const marcarCopiado = () => {
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 2000);
    };

    // Fallback para contextos donde la Clipboard API no está disponible
    // (http, iframes sin permisos, navegadores antiguos, etc.)
    const copiarLegacy = () => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.contentEditable = 'true';
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.padding = '0';
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.background = 'transparent';
        document.body.appendChild(textarea);

        // iOS Safari requiere un Range + Selection explícito
        const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (esIOS) {
          const range = document.createRange();
          range.selectNodeContents(textarea);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          textarea.setSelectionRange(0, texto.length);
        } else {
          textarea.focus();
          textarea.select();
        }

        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        marcarCopiado();
        return;
      }
    } catch {
      /* Intentamos el fallback abajo */
    }

    if (copiarLegacy()) {
      marcarCopiado();
    } else {
      alert('No se pudo copiar automáticamente. Copiá el texto manualmente:\n\n' + texto);
    }
  };

  const compartir = async (texto: string, url: string, tipo: 'url' | 'codigo') => {
    // En móviles, prioriza el panel nativo de compartir.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Invitación al grupo de pedidos',
          text: texto,
          url,
        });
        setCopiado(tipo);
        setTimeout(() => setCopiado(null), 2000);
        return;
      } catch (err: any) {
        // Si el usuario cancela el share, no forzamos copia.
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: copiar texto completo para pegar en WhatsApp, etc.
    await copiar(texto, tipo);
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
  // Paginación del calendario: se muestra una semana (7 días) por página.
  const [semanaActual, setSemanaActual] = useState(0);

  useEffect(() => {
    // El id autoritativo es el del usuario autenticado (viene por prop desde el servidor).
    setClienteActualId(clienteActualIdProp);

    // Compatibilidad por ID: si este navegador tiene un cliente local que ya es
    // miembro del grupo, usamos ese ID para evitar pedir "unirse" otra vez.
    // No usamos email para evitar cruces incorrectos de identidad.
    try {
      const guardado = localStorage.getItem('cliente_actual');
      if (!guardado) return;
      const c = JSON.parse(guardado);
      const idLocal = typeof c?.id === 'string' ? c.id : '';
      if (!idLocal) return;

      const authEsMiembro = clienteActualIdProp ? miembrosState.some((m) => m.cliente_id === clienteActualIdProp) : false;
      const localEsMiembro = miembrosState.some((m) => m.cliente_id === idLocal);

      if ((esAutenticado || esAdminViewer) && !authEsMiembro && localEsMiembro) {
        setClienteActualId(idLocal);
      }
    } catch {
      /* noop */
    }
  }, [clienteActualIdProp, esAdminViewer, esAutenticado, miembrosState]);

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

  useEffect(() => {
    if (!modalAbierto && !diaALimpiar) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalAbierto(null);
        setDiaALimpiar(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [modalAbierto, diaALimpiar]);

  const fechas = [];
  const inicio = parseFechaLocal(fechaInicio);
  const fin = parseFechaLocal(fechaFin);
  const actual = new Date(inicio);
  while (actual <= fin) {
    fechas.push(new Date(actual));
    actual.setDate(actual.getDate() + 1);
  }

  // Paginación por semana calendario COMPLETA (lunes → domingo). Se rellenan los
  // días fuera del plan para que cada semana empiece en lunes y termine en
  // domingo; esos días se muestran grisados y no seleccionables.
  const claveLunes = (d: Date): string => {
    const dt = new Date(d);
    const dow = dt.getDay() === 0 ? 7 : dt.getDay(); // 1=lun … 7=dom
    dt.setDate(dt.getDate() - (dow - 1));
    return formatFechaLocal(dt);
  };
  const lunesInicio = parseFechaLocal(claveLunes(inicio));
  const domingoFin = parseFechaLocal(claveLunes(fin));
  domingoFin.setDate(domingoFin.getDate() + 6);

  const semanas: Date[][] = [];
  const cursorSemana = new Date(lunesInicio);
  while (cursorSemana <= domingoFin) {
    const semana: Date[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(cursorSemana));
      cursorSemana.setDate(cursorSemana.getDate() + 1);
    }
    semanas.push(semana);
  }
  const totalPaginas = Math.max(1, semanas.length);
  const paginaSegura = Math.min(Math.max(0, semanaActual), totalPaginas - 1);
  const fechasPagina = semanas[paginaSegura] || [];

  const getItem = (fecha: string, tipo: string) => {
    return items.find((item) => item.fecha === fecha && item.tipo_comida === tipo);
  };

  const getNombreCliente = (clienteId: string) => {
    const miembro = miembrosState.find((m) => m.cliente_id === clienteId);
    return miembro?.cliente.nombre || 'Desconocido';
  };

  const acuerdoIdsDeItem = (item: ItemPedido): Set<string> => {
    const idsMiembros = new Set(miembrosState.map((m) => m.cliente_id));
    const acuerdo = new Set<string>();
    const votos: string[] = Array.isArray(item.votos) ? item.votos : [];
    votos.forEach((v) => {
      if (idsMiembros.has(v)) acuerdo.add(v);
    });
    if (item.seleccionado_por && idsMiembros.has(item.seleccionado_por)) {
      acuerdo.add(item.seleccionado_por);
    }
    return acuerdo;
  };

  const clienteConfirmoDia = (fecha: string, clienteId: string) => {
    const itemsDia = items.filter((it) => it.fecha === fecha);
    if (itemsDia.length === 0) return false;
    return itemsDia.every((it) => acuerdoIdsDeItem(it).has(clienteId));
  };

  const miembrosConfirmadosEnDia = (fecha: string) => {
    const itemsDia = items.filter((it) => it.fecha === fecha);
    if (itemsDia.length === 0) return 0;
    return miembrosState.filter((m) => clienteConfirmoDia(fecha, m.cliente_id)).length;
  };

  // Análisis nutricional + hildegardiano de un plato (por porción)
  const analizarPlato = (plato: Plato) => {
    const receta = plato.receta;
    if (!receta || !receta.ingredientes || receta.ingredientes.length === 0) return null;

    // Peso total real del plato y porciones confiables (mismo criterio que el
    // motor central): si las porciones cargadas dan una ración implausible, se
    // estiman a partir del peso total.
    const pesoTotalReceta = receta.ingredientes.reduce(
      (s, ri) => s + (ri.ingrediente ? normalizarAGramos(ri.cantidad || 0, ri.unidad || '') : 0),
      0
    );
    const porciones = estimarPorciones(pesoTotalReceta, receta.porciones);
    const n: Record<string, number> = {
      calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, grasas_saturadas: 0, fibra: 0, azucar: 0,
      sodio: 0, calcio: 0, hierro: 0, magnesio: 0, potasio: 0, zinc: 0, fosforo: 0,
      vitaminaA: 0, vitaminaC: 0, vitaminaD: 0, vitaminaE: 0, vitaminaK: 0,
      vitaminaB1: 0, vitaminaB2: 0, vitaminaB3: 0, vitaminaB5: 0, vitaminaB6: 0, vitaminaB9: 0, vitaminaB12: 0,
    };
    const temp: Record<string, number> = {};
    const venenos: string[] = [];
    const pilares = new Set<string>();
    const ingsHildegarda: Array<{ ing: typeof receta.ingredientes[number]['ingrediente']; gramos: number }> = [];
    let peso = 0;
    let subtilitatPond = 0;
    let pesoCocido = 0;
    let pesoCrudo = 0;

    receta.ingredientes.forEach((ri) => {
      const ing = ri.ingrediente;
      if (!ing) return;
      const gramos = normalizarAGramos(ri.cantidad || 0, ri.unidad || '') / porciones;
      const f = gramos / 100;

      // Coherencia nutricional: un subnutriente no puede superar a su padre.
      const grasas = Math.max(0, ing.grasas_g || 0);
      const grasasSaturadas = Math.min(Math.max(0, ing.grasas_saturadas_g || 0), grasas);
      const carbohidratos = Math.max(0, ing.carbohidratos_g || 0);
      const azucar = Math.min(Math.max(0, ing.azucar_g || 0), carbohidratos);
      const fibra = Math.min(Math.max(0, ing.fibra_g || 0), carbohidratos);

      n.calorias += (ing.calorias || 0) * f;
      n.proteinas += (ing.proteinas_g || 0) * f;
      n.carbohidratos += carbohidratos * f;
      n.grasas += grasas * f;
      n.grasas_saturadas += grasasSaturadas * f;
      n.fibra += fibra * f;
      n.azucar += azucar * f;
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
      ingsHildegarda.push({ ing, gramos });
    });

    const calido = (temp.calido || 0) + (temp.calido_seco || 0) + (temp.calido_humedo || 0);
    const frio = (temp.frio || 0) + (temp.frio_seco || 0) + (temp.frio_humedo || 0);
    const seco = (temp.calido_seco || 0) + (temp.frio_seco || 0);
    const humedo = (temp.calido_humedo || 0) + (temp.frio_humedo || 0);
    const tot = calido + frio;
    const pesoTot = pesoCocido + pesoCrudo;
    const porcionesReceta = receta.porciones ?? 0;
    const bajaConfianza = pesoTotalReceta > 0 && porcionesReceta > 0
      ? pesoTotalReceta / porcionesReceta < 150 || pesoTotalReceta / porcionesReceta > 700
      : false;

    // Evaluación hildegardiana por los flags reales de la BD (no por nombre)
    const evaluacion = evaluarHildegardianoDB(ingsHildegarda);

    return {
      n,
      porcCalido: tot ? (calido / tot) * 100 : 0,
      porcFrio: tot ? (frio / tot) * 100 : 0,
      porcSeco: tot ? (seco / tot) * 100 : 0,
      porcHumedo: tot ? (humedo / tot) * 100 : 0,
      viriditas: peso ? subtilitatPond / peso : 0,
      porcCocido: pesoTot ? (pesoCocido / pesoTot) * 100 : 0,
      bajaConfianza,
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
    let algunaBajaConfianza = false;
    const venenos = new Set<string>();
    const pilares = new Set<string>();

    itemsDia.forEach((it) => {
      const plato = platos.find((p) => p.id === it.plato_id);
      if (!plato) return;
      const a = analizarPlato(plato);
      if (!a) return;
      const cantidad = it.cantidad || 1;
      platosAnalizados += cantidad;
      if (a.bajaConfianza) algunaBajaConfianza = true;
      NUTRIENTES_LISTA.forEach((nut) => {
        n[nut.key] += (a.n[nut.key] || 0) * cantidad;
      });
      const cal = (a.n.calorias || 0) * cantidad;
      calCalido += a.porcCalido * cal;
      calFrio += a.porcFrio * cal;
      calTot += cal;
      sumViriditas += a.viriditas * cantidad;
      sumCocido += a.porcCocido * cantidad;
      sumSeco += a.porcSeco * cantidad;
      sumHumedo += a.porcHumedo * cantidad;
      sumPuntaje += a.evaluacion.puntaje * cantidad;
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
      bajaConfianza: algunaBajaConfianza,
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
      const cantidad = it.cantidad || 1;
      platosAnalizados += cantidad;
      NUTRIENTES_LISTA.forEach((nut) => {
        n[nut.key] += (a.n[nut.key] || 0) * cantidad;
      });
      const cal = (a.n.calorias || 0) * cantidad;
      calCalido += a.porcCalido * cal;
      calFrio += a.porcFrio * cal;
      calTot += cal;
      sumViriditas += a.viriditas * cantidad;
      sumPuntaje += a.evaluacion.puntaje * cantidad;
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

    const cumpleDia = (plato: any) => {
      // Solo se muestran los platos asignados a este día de la semana.
      // Se normalizan días para tolerar datos legacy (strings, nulls, etc.).
      const diasNormalizados = Array.isArray(plato.dias_semana)
        ? plato.dias_semana
            .map((d: any) => Number(d))
            .filter((d: number) => Number.isInteger(d) && d >= 1 && d <= 7)
        : [];

      const diasDelPlato =
        plato.disponible_todos_dias
          ? [1, 2, 3, 4, 5, 6, 7]
          : diasNormalizados.length > 0
          ? diasNormalizados
          : plato.dia_semana_id !== null
          ? [Number(plato.dia_semana_id)]
          : [];

      return diasDelPlato.includes(diaSemana);
    };

    const cumpleFiltrosExtra = (plato: any) => {

      // Filtro por texto (nombre, descripción o ingrediente)
      if (textoBusqueda) {
        const texto = textoBusqueda.toLowerCase();
        const coincideNombre = plato.nombre.toLowerCase().includes(texto);
        const coincideDesc = plato.descripcion?.toLowerCase().includes(texto) || false;
        const coincideIngrediente = plato.receta?.ingredientes?.some((ri: any) =>
          ri.ingrediente.nombre.toLowerCase().includes(texto)
        ) || false;
        if (!coincideNombre && !coincideDesc && !coincideIngrediente) return false;
      }

      // Filtro por categoría adicional
      if (categoriaFiltro && plato.categoria_id !== categoriaFiltro) return false;

      // Filtro por temperamento
      if (temperamentoFiltro && plato.receta?.ingredientes) {
        const tieneTemperamento = plato.receta.ingredientes.some((ri: any) =>
          ri.ingrediente.temperamento === temperamentoFiltro
        );
        if (!tieneTemperamento) return false;
      }

      // Filtro sin venenos
      if (soloSinVenenos && plato.receta?.ingredientes) {
        const tieneVeneno = plato.receta.ingredientes.some((ri: any) =>
          ri.ingrediente.es_veneno_hildegardiano
        );
        if (tieneVeneno) return false;
      }

      return true;
    };

    // 1) Preferencia: categoría esperada + día + filtros extra.
    const estrictos = platos.filter((plato) => {
      if (plato.categoria_id !== tipoInfo.categoriaId) return false;
      if (!cumpleDia(plato)) return false;
      return cumpleFiltrosExtra(plato);
    });

    // 2) Fallback: si llega 0/1 opciones (caso reportado en móviles), abrir a
    // cualquier categoría del mismo día para no ocultar platos válidos.
    if (estrictos.length > 1) return estrictos;

    const ampliados = platos.filter((plato) => {
      if (!cumpleDia(plato)) return false;
      return cumpleFiltrosExtra(plato);
    });

    return ampliados.length > 0 ? ampliados : estrictos;
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
      setMensaje(`✅ ${plato.nombre} seleccionado para ${parseFechaLocal(fecha).toLocaleDateString('es-AR')}`);
      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const confirmarDia = async (fecha: string) => {
    if (!clienteActualId) {
      setMensaje('❌ Iniciá sesión o registrate para confirmar el día.');
      setTimeout(() => setMensaje(''), 5000);
      return;
    }
    setCargando(true);
    setMensaje('');

    try {
      const response = await fetch(`/api/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'confirmar_dia',
          cliente_id: clienteActualId,
          fecha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al confirmar');
      }

      const data = await response.json();
      setMensaje(data.mensaje);

      // Al confirmar un día, quedo "de acuerdo" con todos los platos de ese día.
      setItems((prev) =>
        prev.map((it) => {
          if (it.fecha !== fecha) return it;
          const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
          return votos.includes(clienteActualId) ? it : { ...it, votos: [...votos, clienteActualId] };
        })
      );

      setTimeout(() => setMensaje(''), 5000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const desconfirmarDia = async (fecha: string) => {
    if (!clienteActualId) {
      setMensaje('❌ Iniciá sesión o registrate para reactivar el día.');
      setTimeout(() => setMensaje(''), 5000);
      return;
    }
    setCargando(true);
    setMensaje('');

    try {
      const response = await fetch(`/api/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'desconfirmar_dia',
          cliente_id: clienteActualId,
          fecha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al reactivar');
      }

      const data = await response.json();
      setMensaje(data.mensaje);

      // Al reabrir un día, retiro mi voto en los platos de ese día.
      setItems((prev) =>
        prev.map((it) => {
          if (it.fecha !== fecha) return it;
          const votos: string[] = Array.isArray(it.votos) ? it.votos : [];
          return votos.includes(clienteActualId) ? { ...it, votos: votos.filter((v) => v !== clienteActualId) } : it;
        })
      );

      setTimeout(() => setMensaje(''), 5000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const limpiarDia = async (fecha: string) => {
    if (!clienteActualId) {
      setMensaje('❌ Iniciá sesión o registrate para limpiar el día.');
      setTimeout(() => setMensaje(''), 5000);
      return;
    }
    setCargando(true);
    setMensaje('');

    try {
      const response = await fetch(`/api/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'limpiar_dia',
          cliente_id: clienteActualId,
          fecha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al limpiar el día');
      }

      const data = await response.json();
      setMensaje(data.mensaje || '🧹 Día limpiado');
      setItems((prev) => prev.filter((it) => it.fecha !== fecha));
      setAnalisisVersion((v) => v + 1);
      setDiaALimpiar(null);

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

  const miembrosConfirmadosLista = miembrosState.filter((m) =>
    items.length > 0 && items.every((it) => acuerdoIdsDeItem(it).has(m.cliente_id))
  );
  const miembrosPendientes = miembrosState.filter((m) => !miembrosConfirmadosLista.some((ok) => ok.cliente_id === m.cliente_id));
  const todosConfirmaron = items.length > 0 && miembrosPendientes.length === 0;
  const clienteActualIdSeguro = clienteActualId ?? '';

  // ¿El usuario actual ya es miembro del grupo?
  const esMiembro = clienteActualId ? miembrosState.some((m) => m.cliente_id === clienteActualId) : false;
  const puedeVerSinUnirse = esAdminViewer;
  // Primer render estable: SSR y primera hidratación usan solo props del servidor.
  const puedeVerInicial = (clienteActualIdProp ? miembros.some((m) => m.cliente_id === clienteActualIdProp) : false) || esAdminViewer;
  const puedeVer = hidratado ? (esMiembro || puedeVerSinUnirse) : puedeVerInicial;

  const puedeUnirse = esAutenticado && !esAdminViewer;

  // Unirse al grupo con el código (palabra secreta)
  const unirseAlGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteActualId) {
      setMensaje('❌ Iniciá sesión o registrate para unirte al grupo.');
      setTimeout(() => setMensaje(''), 5000);
      return;
    }
    setUniendo(true);
    setMensaje('');
    try {
      const res = await fetch('/api/grupos/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palabra_secreta: codigoUnirse.trim().toUpperCase(),
          cliente_id: clienteActualId,
          nombre: clienteNombre,
          email: clienteEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo unir al grupo');

      // Agregarse a la lista de miembros para desbloquear la selección
      setMiembrosState((prev) => [
        ...prev,
        {
          id: `tmp-${clienteActualId}`,
          cliente_id: clienteActualId,
          cliente: { id: clienteActualId, nombre: clienteNombre || 'Vos', email: clienteEmail },
          rol: 'miembro',
          confirmado_general: false,
        },
      ]);
      window.dispatchEvent(new Event('cliente-actual-updated'));
      setMensaje('✅ Te uniste al grupo. Ya podés elegir tus platos.');
      setTimeout(() => setMensaje(''), 4000);
    } catch (err: any) {
      setMensaje(`❌ ${err.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setUniendo(false);
    }
  };

  // Abandonar el grupo
  const salirDelGrupo = async () => {
    if (!confirm('¿Seguro que querés abandonar este grupo? Se quitará tu participación.')) return;
    setCargando(true);
    setMensaje('');
    try {
      const res = await fetch(`/api/grupos/${grupoId}/salir`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo abandonar el grupo');

      // Quitarse de la lista de miembros y volver al menú
      setMiembrosState((prev) => prev.filter((m) => m.cliente_id !== clienteActualId));
      router.push('/menu/resto-presta-bingen-all');
      router.refresh();
    } catch (err: any) {
      setMensaje(`❌ ${err.message}`);
      setTimeout(() => setMensaje(''), 5000);
      setCargando(false);
    }
  };

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos;

  // 🍽️ Producción por día (mismo bloque que ve el admin): platos a preparar,
  // recetas escalables por porciones e ingredientes/lista de compras por día.
  const produccionPorDia = useMemo(() => {
    const platosPorId = new Map<string, Plato>();
    platos.forEach((p) => platosPorId.set(p.id, p));

    const platosDeItem = (item: ItemPedido) => {
      // Cantidad = miembros que quieren ese plato (quien lo propuso + los de acuerdo),
      // contando solo miembros actuales.
      const acuerdo = new Set<string>();
      if (Array.isArray(item.votos)) {
        item.votos.forEach((v: string) => {
          if (miembrosState.some((m) => m.cliente_id === v)) acuerdo.add(v);
        });
      }
      if (item.seleccionado_por && miembrosState.some((m) => m.cliente_id === item.seleccionado_por)) {
        acuerdo.add(item.seleccionado_por);
      }
      return Math.max(acuerdo.size, 1);
    };

    const normalizarPasos = (pasos: any): string[] =>
      (Array.isArray(pasos) ? pasos : [])
        .map((p: any) => textoDePaso(p))
        .filter((s: string) => s && s.trim() !== '');

    // Se excluyen los días anteriores a HOY: sus pedidos ya no deben sumarse a
    // la lista de compras.
    const fechasStr = [...new Set(items.map((i) => i.fecha))].filter((f) => f >= hoyServidor).sort();

    return fechasStr.map((fecha) => {
      const itemsDia = items.filter((i) => i.fecha === fecha);

      const platosMap = new Map<
        string,
        { platoId: string; nombre: string; precio: number; platos: number; subtotal: number; porcionesBase: number; pasos: string[]; ingredientes: { nombre: string; cantidad: number; unidad: string }[] }
      >();
      itemsDia.forEach((item) => {
        const n = platosDeItem(item);
        const full = platosPorId.get(item.plato_id);
        const precio = item.plato?.precio ?? full?.precio ?? 0;
        const key = item.plato_id;
        let prev = platosMap.get(key);
        if (!prev) {
          const receta = full?.receta || null;
          const ingr = (receta?.ingredientes || []).map((ri) => ({
            nombre: ri.ingrediente?.nombre || 'Ingrediente',
            cantidad: Number(ri.cantidad) || 0,
            unidad: ri.unidad || 'u',
          }));
          prev = {
            platoId: key,
            nombre: item.plato?.nombre || full?.nombre || 'Plato',
            precio,
            platos: 0,
            subtotal: 0,
            porcionesBase: receta?.porciones || 1,
            pasos: normalizarPasos(receta?.pasos),
            ingredientes: ingr,
          };
        }
        prev.platos += n;
        prev.subtotal = prev.precio * prev.platos;
        platosMap.set(key, prev);
      });
      const platosAgg = Array.from(platosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
      const totalDia = platosAgg.reduce((s, p) => s + p.subtotal, 0);

      const ingMap = new Map<string, { nombre: string; cantidad: number; unidad: string; categoria: string | null }>();
      itemsDia.forEach((item) => {
        const full = platosPorId.get(item.plato_id);
        const receta = full?.receta;
        if (!receta) return;
        const n = platosDeItem(item);
        const factor = n / (receta.porciones || 1);
        (receta.ingredientes || []).forEach((ri) => {
          const ing = ri.ingrediente;
          if (!ing) return;
          const unidad = ri.unidad || 'g';
          const key = `${ing.nombre}|${unidad}`;
          const prevIng = ingMap.get(key) || { nombre: ing.nombre, cantidad: 0, unidad, categoria: null };
          prevIng.cantidad += (Number(ri.cantidad) || 0) * factor;
          ingMap.set(key, prevIng);
        });
      });
      const ingredientes = Array.from(ingMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
      const totalPlatosDia = platosAgg.reduce((s, p) => s + p.platos, 0);

      return {
        fecha,
        platosAgg,
        totalDia,
        ingredientes,
        totalPlatosDia,
        conReceta: itemsDia.some((i) => !!platosPorId.get(i.plato_id)?.receta),
      };
    });
  }, [items, platos, miembrosState]);

  // Si no es miembro y tampoco es admin en modo visualización, se muestra unión por código.
  if (!puedeVer) {
    if (!puedeUnirse) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <header className="bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600 text-white shadow-lg">
            <div className="max-w-6xl mx-auto px-4 py-6">
              <p className="text-teal-100 text-xs font-semibold uppercase tracking-wide">🔑 Grupo de pedido</p>
              <h1 className="text-2xl font-bold font-serif">Iniciá sesión para participar</h1>
            </div>
          </header>

          {mensaje && (
            <div className="max-w-6xl mx-auto px-4 py-2">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg">{mensaje}</div>
            </div>
          )}

          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-l-4 border-amber-500 p-5 space-y-4">
              <div>
                <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">🔒 Para unirte, primero autenticáte</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Iniciá sesión o creá tu cuenta. Después vas a ver el formulario para ingresar el código del grupo.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`/auth/login?redirect=/pedidos/grupo/${grupoId}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg"
                >
                  Iniciar sesión
                </a>
                <a
                  href="/auth/registro"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-lg"
                >
                  Registrarme
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <header className="bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <p className="text-teal-100 text-xs font-semibold uppercase tracking-wide">🔑 Grupo de pedido</p>
            <h1 className="text-2xl font-bold font-serif">Uníte para participar</h1>
          </div>
        </header>

        {mensaje && (
          <div className="max-w-6xl mx-auto px-4 py-2">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg">{mensaje}</div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-l-4 border-amber-500 p-5">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">🔑 Uníte a este grupo</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Para poder elegir tus platos, ingresá el <strong>código</strong> que te compartieron.
            </p>
            <form onSubmit={unirseAlGrupo} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={codigoUnirse}
                onChange={(e) => setCodigoUnirse(e.target.value.toUpperCase())}
                placeholder="Código (ej: SZLUUZ)"
                className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono tracking-widest uppercase"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={uniendo || codigoUnirse.trim().length < 4}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
              >
                {uniendo ? '⏳ Uniéndote…' : 'Unirme'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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
            · {fechas.length} días · {miembrosState.length} miembros
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
          const shareUrlInstalable = (() => {
            try {
              const u = new URL(shareUrl);
              u.searchParams.set('instalar', '1');
              return u.toString();
            } catch {
              return shareUrl;
            }
          })();
          const rangoFechas =
            `${parseFechaLocal(fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}` +
            ` al ${parseFechaLocal(fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
          const mensajeCompartir =
            `¡Sumate a nuestro grupo para pedir comida en Bingen! 🍽️\n\n` +
            `👤 Creado por: ${creador}\n` +
            `📅 Plan: ${rangoFechas}\n\n` +
            `🔑 Código para unirse: ${palabraSecreta}\n\n` +
            `📲 Instalación rápida: al abrir el enlace, instalá la app desde el aviso o desde el navegador (Agregar a pantalla de inicio).\n\n` +
            `🔗 O entrá directo con este enlace:\n${shareUrlInstalable}`;

          return (
            <details className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-l-4 border-emerald-500 group">
              <summary className="cursor-pointer p-4 font-bold text-gray-800 dark:text-gray-100 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
                <span>🔗 Invitá a tu grupo</span>
                <span className="text-gray-400 dark:text-gray-500 text-sm transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                <span className="font-semibold">📅 Plan:</span> {rangoFechas}
                {' · '}
                <span className="font-semibold">👤 Creado por:</span> {creador}
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="w-full sm:w-auto">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Código para unirse</p>
                  <span className="text-xl sm:text-2xl font-bold tracking-widest text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg inline-block">
                    {palabraSecreta}
                  </span>
                </div>
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Enlace</p>
                  <input
                    readOnly
                    value={shareUrlInstalable}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Este enlace abre el grupo y sugiere instalar la app en el teléfono.
                  </p>
                </div>
              </div>

              <button
                onClick={() => compartir(mensajeCompartir, shareUrlInstalable, 'url')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg"
              >
                {copiado === 'url' ? '✅ Datos copiados' : '📤 Compartir (copiar datos)'}
              </button>
              </div>
            </details>
          );
        })()}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <details className="bg-white dark:bg-gray-800 rounded-xl shadow-md group">
          <summary className="cursor-pointer p-4 font-bold text-gray-800 dark:text-gray-100 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
            <span>👥 Miembros del Grupo ({miembrosState.length})</span>
            <span className="text-gray-400 dark:text-gray-500 text-sm transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="px-4 pb-4">
            {esMiembro && (
              <div className="flex justify-end mb-3">
                <button
                  onClick={salirDelGrupo}
                  disabled={cargando}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  🚪 Abandonar grupo
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {miembrosState.map((miembro) => (
              (() => {
                const confirmado = miembrosConfirmadosLista.some((m) => m.cliente_id === miembro.cliente_id);
                return (
              <div
                key={miembro.id}
                className={`p-3 rounded-lg border-2 ${
                  confirmado
                    ? 'bg-green-100 dark:bg-green-900/40 border-green-600 dark:border-green-400'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {confirmado ? '✅' : '⏳'}
                  </span>
                  <div>
                    <p className={`font-semibold text-sm ${confirmado ? 'text-green-950 dark:text-green-100' : 'text-gray-800 dark:text-gray-100'}`}>
                      {miembro.cliente.nombre}
                      {miembro.cliente_id === clienteActualId && ' (Vos)'}
                    </p>
                    <p className={`text-xs ${confirmado ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-300'}`}>
                      {miembro.rol === 'creador' ? '👑 Creador' : '👤 Miembro'}
                    </p>
                  </div>
                </div>
              </div>
                );
              })()
            ))}
          </div>
          </div>
        </details>
      </div>

      {mensaje && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
            {mensaje}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Paginación semanal */}
        {totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-md p-3">
            <button
              onClick={() => setSemanaActual((s) => Math.max(0, s - 1))}
              disabled={paginaSegura === 0}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Semana anterior
            </button>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-center">
              Semana {paginaSegura + 1} de {totalPaginas}
              {fechasPagina.length > 0 && (
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                  {fechasPagina[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} –{' '}
                  {fechasPagina[fechasPagina.length - 1].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
            <button
              onClick={() => setSemanaActual((s) => Math.min(totalPaginas - 1, s + 1))}
              disabled={paginaSegura >= totalPaginas - 1}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Semana siguiente →
            </button>
          </div>
        )}
        <div className="space-y-4">
          {fechasPagina.map((fecha) => {
            const fechaStr = formatFechaLocal(fecha);
            const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();
            const diaInfo = DIAS_SEMANA.find((d) => d.id === diaSemana);
            const esPasado = fechaStr < hoyServidor;
            const enRango = fechaStr >= fechaInicio && fechaStr <= fechaFin;
            const itemsDia = items.filter((it) => it.fecha === fechaStr);
            const tienePlatosDia = itemsDia.length > 0;

            // Días fuera del rango del plan: solo relleno visual (lunes-domingo).
            if (!enRango) {
              return (
                <div
                  key={fechaStr}
                  className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 opacity-60"
                >
                  <h3 className="font-bold text-lg text-gray-400 dark:text-gray-500 line-through">
                    {diaInfo?.icono} {diaInfo?.nombre}
                  </h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500 line-through">
                    {fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold mt-1">
                    Fuera del plan
                  </p>
                </div>
              );
            }

            return (
              <div
                key={fechaStr}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 ${
                  esPasado ? 'opacity-60 grayscale' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                  <div>
                    <h3
                      className={`font-bold text-lg ${
                        esPasado
                          ? 'text-gray-400 dark:text-gray-500 line-through'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {diaInfo?.icono} {diaInfo?.nombre}
                    </h3>
                    <p className={`text-sm ${esPasado ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-300'}`}>
                      {fecha.toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    {esPasado ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">
                        ⏳ Día pasado — no se suma a la lista de compras
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700 font-semibold mt-1">
                        Tema: {diaInfo?.tematica}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {miembrosConfirmadosEnDia(fechaStr)}/{miembrosState.length} confirmaciones
                    </p>
                    {esMiembro && (
                      <div className="mt-1 flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            clienteConfirmoDia(fechaStr, clienteActualIdSeguro)
                              ? desconfirmarDia(fechaStr)
                              : confirmarDia(fechaStr)
                          }
                          disabled={cargando || (!clienteConfirmoDia(fechaStr, clienteActualIdSeguro) && !tienePlatosDia)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            clienteConfirmoDia(fechaStr, clienteActualIdSeguro)
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : tienePlatosDia
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-gray-300 text-gray-700'
                          } disabled:opacity-50`}
                        >
                          {clienteConfirmoDia(fechaStr, clienteActualIdSeguro)
                            ? '✅ Día confirmado'
                            : tienePlatosDia
                            ? '✅ Confirmar día'
                            : 'Sin platos'}
                        </button>

                        <button
                          onClick={() => setDiaALimpiar(fechaStr)}
                          disabled={cargando || !tienePlatosDia}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🧹 Limpiar día
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {TIPOS_COMIDA.map((tipo) => {
                    const item = getItem(fechaStr, tipo.id);
                    const votos: string[] = Array.isArray(item?.votos) ? (item!.votos as string[]) : [];
                    // Están "de acuerdo": quien propuso el plato + quienes votaron, contando solo miembros actuales
                    const acuerdoIds = new Set<string>();
                    votos.forEach((v) => {
                      if (miembrosState.some((m) => m.cliente_id === v)) acuerdoIds.add(v);
                    });
                    if (item?.seleccionado_por && miembrosState.some((m) => m.cliente_id === item.seleccionado_por)) {
                      acuerdoIds.add(item.seleccionado_por);
                    }
                    const cantAcuerdo = acuerdoIds.size;
                    const yaVote = acuerdoIds.has(clienteActualIdSeguro);
                    const puedeInteractuar = esMiembro;
                    const platoFull = item ? platos.find((p) => p.id === item.plato_id) : undefined;
                    const imagenFondo = item && platoFull?.imagen ? platoFull.imagen : null;

                    return (
                      <div
                        key={tipo.id}
                        style={imagenFondo ? { backgroundImage: `url("${imagenFondo}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                        className={`relative overflow-hidden p-3 rounded-lg transition-all ${
                          imagenFondo
                            ? 'border-2 border-green-500 text-white min-h-[120px]'
                            : !esMiembro
                            ? 'bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 opacity-60'
                            : item
                            ? 'bg-green-100 dark:bg-green-950/30 border-2 border-green-500 dark:border-green-700'
                            : 'bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {imagenFondo && <div className="absolute inset-0 bg-black/45" />}
                        <div className="relative">
                        <button
                          type="button"
                          onClick={() => puedeInteractuar && setModalAbierto({ fecha: fechaStr, tipo: tipo.id })}
                          disabled={cargando || !puedeInteractuar}
                          className={`w-full text-left ${puedeInteractuar ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          <p className={`text-xs font-semibold mb-1 ${imagenFondo ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>
                            {tipo.icono} {tipo.label}
                          </p>
                          {item ? (
                            <>
                              <p className={`text-sm font-bold ${imagenFondo ? 'text-white drop-shadow' : 'text-gray-800 dark:text-gray-100'}`}>
                                {item.plato?.nombre || 'Cargando...'}
                              </p>
                              <p className={`text-xs font-semibold mt-1 ${imagenFondo ? 'text-emerald-200' : 'text-green-700 dark:text-green-300'}`}>
                                ${item.plato?.precio.toLocaleString('es-AR')}
                              </p>
                              <p className={`text-xs mt-1 ${imagenFondo ? 'text-white/80' : 'text-gray-600 dark:text-gray-300'}`}>
                                👤 {getNombreCliente(item.seleccionado_por)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {!esMiembro && esAdminViewer ? 'Modo solo lectura (admin)' : !esMiembro ? 'Uníte para elegir' : 'Tocá para elegir'}
                            </p>
                          )}
                        </button>

                        {item && (
                          <div className={`mt-2 pt-2 border-t ${imagenFondo ? 'border-white/30' : 'border-white/70 dark:border-gray-700'}`}>
                            <p className={`text-[11px] font-semibold ${imagenFondo ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                              👍 {cantAcuerdo}/{miembrosState.length} de acuerdo
                            </p>
                            {puedeInteractuar && !yaVote && (
                              <button
                                type="button"
                                onClick={() => seleccionarPlato(fechaStr, tipo.id, item.plato_id)}
                                disabled={cargando}
                                className="mt-1 w-full text-[11px] font-semibold bg-emerald-600 text-white rounded px-2 py-1 hover:bg-emerald-700 disabled:opacity-50"
                              >
                                👍 Estoy de acuerdo
                              </button>
                            )}
                            {yaVote && (
                              <p className={`text-[11px] font-semibold mt-1 ${imagenFondo ? 'text-emerald-200' : 'text-emerald-700'}`}>✓ Estás de acuerdo</p>
                            )}
                            {puedeInteractuar && (
                              <button
                                type="button"
                                onClick={() => setModalAbierto({ fecha: fechaStr, tipo: tipo.id })}
                                disabled={cargando}
                                className="mt-1 w-full text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                              >
                                ✏️ Proponer otro plato
                              </button>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
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
                      ? { emoji: '🟢', label: 'Muy equilibrado', bg: 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200' }
                      : ad.puntaje >= 40
                      ? { emoji: '🟡', label: 'Aceptable', bg: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200' }
                      : { emoji: '🔴', label: 'Poco equilibrado', bg: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200' };
                  // Micronutrientes: ausentes, insuficientes y excesos
                  const { ausentes, insuficientes, excesos, bajos } = evaluarNutrientes(ad.n);
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {/* Resumen compacto siempre visible */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">📊 Resumen del día:</span>
                        <span className={`rounded px-2 py-0.5 font-semibold ${estCal.bg}`}>
                          {estCal.emoji} Calorías: {estCal.label}
                        </span>
                        <span className={`rounded px-2 py-0.5 font-semibold ${estProt.bg}`}>
                          {estProt.emoji} Proteínas: {estProt.label}
                        </span>
                        {bajos > 0 ? (
                          <span className="bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded px-2 py-0.5 font-semibold">
                            ⚠️ {bajos} vitaminas/minerales bajos
                          </span>
                        ) : (
                          <span className="bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 rounded px-2 py-0.5 font-semibold">
                            ✅ Vitaminas y minerales cubiertos
                          </span>
                        )}
                        {excesos.length > 0 && (
                          <span className="bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 rounded px-2 py-0.5 font-semibold">
                            ⚠️ Exceso de {excesos.map((k) => NUTRIENTE_META[k].l.toLowerCase()).join(', ')}
                          </span>
                        )}
                        <span className={`rounded px-2 py-0.5 font-semibold ${estHild.bg}`}>
                          🌿 Santa Hildegarda: {estHild.label}
                        </span>
                        {ad.bajaConfianza && (
                          <span className="rounded px-2 py-0.5 font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                            ⚠️ Análisis aproximado
                          </span>
                        )}
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={() => toggleAnalisisDia(fechaStr, 'cientifico')}
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tab === 'cientifico' ? 'bg-blue-700 text-white' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                            }`}
                          >
                            🔬 Científico
                          </button>
                          <button
                            onClick={() => toggleAnalisisDia(fechaStr, 'hildegardiano')}
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tab === 'hildegardiano' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                            }`}
                          >
                            🌿 Hildegardiano
                          </button>
                        </div>
                      </div>

                      {/* Detalle científico del día: en lenguaje simple */}
                      {tab === 'cientifico' && (
                        <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-3">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Esto es lo que aportan los platos elegidos para <strong>una persona en todo el día</strong>.
                          </p>

                          {/* Calorías y proteínas con lenguaje claro */}
                          {[
                            { l: 'Calorías', val: cal, meta: metaCal, u: 'kcal', pct: pctCal, est: estCal },
                            { l: 'Proteínas', val: prot, meta: metaProt, u: 'g', pct: pctProt, est: estProt },
                          ].map((g) => (
                            <div key={g.l} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-blue-100 dark:border-blue-900">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{g.l}</span>
                                <span className={`text-xs font-semibold rounded px-2 py-0.5 ${g.est.bg}`}>
                                  {g.est.emoji} {g.est.label}
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                                <div className={`h-full ${g.est.bar}`} style={{ width: `${Math.min(g.pct, 100)}%` }} />
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                Aporta <strong>{g.val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} {g.u}</strong> de
                                los <strong>{g.meta} {g.u}</strong> recomendados por día — {vecesTexto(g.pct)}.
                              </p>
                            </div>
                          ))}

                          {/* Vitaminas y minerales */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-blue-100">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">🧪 Vitaminas y minerales</p>
                            {ausentes.length === 0 && insuficientes.length === 0 ? (
                              <p className="text-xs text-green-700">
                                ✅ El día cubre bien las vitaminas y minerales principales.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {ausentes.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-700 dark:text-gray-200 mb-1">
                                      Este día <strong>no incluye</strong>:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {ausentes.map((k) => (
                                        <span
                                          key={k}
                                          className="bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded px-2 py-0.5 text-xs font-semibold"
                                        >
                                          {NUTRIENTE_META[k].l}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {insuficientes.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-700 dark:text-gray-200 mb-1">
                                      Incluye <strong>muy poca cantidad</strong> de (menos de la mitad de lo recomendado):
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {insuficientes.map((k) => (
                                        <span
                                          key={k}
                                          className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 rounded px-2 py-0.5 text-xs font-semibold"
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
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-orange-200 dark:border-orange-900">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">⚠️ En exceso</p>
                              <p className="text-xs text-gray-700 dark:text-gray-200 mb-1">
                                Este día tiene <strong>más de lo recomendado</strong> de:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {excesos.map((k) => (
                                  <span
                                    key={k}
                                    className="bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 rounded px-2 py-0.5 text-xs font-semibold"
                                  >
                                    {NUTRIENTE_META[k].l}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                Conviene no abusar de la sal (sodio), el azúcar y las grasas saturadas.
                              </p>
                            </div>
                          )}

                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
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
                          <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-3 text-xs text-gray-700 dark:text-gray-200">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Según la alimentación de <strong>Santa Hildegarda de Bingen</strong>, que busca el equilibrio
                              entre alimentos que «calientan» y «refrescan» el cuerpo.
                            </p>

                            {/* Veredicto general */}
                            <div className={`rounded-lg px-3 py-2 font-semibold ${verdicto.bg}`}>
                              {verdicto.emoji} {verdicto.label}
                            </div>

                            {/* ¿Calienta o refresca? */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">🌡️ ¿Calienta o refresca?</p>
                              {(ad.porcCalido > 0 || ad.porcFrio > 0) ? (
                                <div className="w-full h-5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700 mb-1">
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
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Sin datos suficientes.</p>
                              )}
                              <p className="text-xs text-gray-600 dark:text-gray-300">{tempTexto}</p>
                            </div>

                            {/* Frescura / energía vital */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">🌿 Frescura y energía vital</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">{viridTexto}</p>
                            </div>

                            {/* Pilares del bienestar y venenos */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900 space-y-1">
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

                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
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
        {/* Paginación semanal (inferior) */}
        {totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-md p-3">
            <button
              onClick={() => {
                setSemanaActual((s) => Math.max(0, s - 1));
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={paginaSegura === 0}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Semana anterior
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Semana {paginaSegura + 1} de {totalPaginas}
            </span>
            <button
              onClick={() => {
                setSemanaActual((s) => Math.min(totalPaginas - 1, s + 1));
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={paginaSegura >= totalPaginas - 1}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Semana siguiente →
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">💰 Resumen del Pedido</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {items.length} platos seleccionados · {miembrosConfirmadosLista.length}/{miembrosState.length} miembros de acuerdo en todo el plan
              </p>
            </div>
            <p className="text-3xl font-bold text-amber-600">
              ${total.toLocaleString('es-AR')}
            </p>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-200">
            La confirmación ahora es por día. Confirmá cada jornada desde su tarjeta para cerrar tu acuerdo diario.
          </p>

          {todosConfirmaron && (
            <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-semibold">
                🎉 ¡Excelente! Todos los miembros están de acuerdo en todos los platos cargados.
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
              <button
                onClick={() => setInformeAbierto((v) => !v)}
                className="w-full flex justify-between items-center gap-2 p-4 font-bold text-gray-800 dark:text-gray-100 text-left"
              >
                <span>🧪 Informe Nutricional completo ({dias} días) de {desde} a {hasta}</span>
                <span>{informeAbierto ? '▲' : '▼'}</span>
              </button>

              {informeAbierto && (
                <div className="p-4 pt-0">
                  {!ar ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
                          <span className="font-semibold text-gray-700 dark:text-gray-200">📊 Resumen ({dias} días):</span>
                          <span className={`rounded px-2 py-0.5 font-semibold ${estCal.bg}`}>
                            {estCal.emoji} Calorías/día: {estCal.label}
                          </span>
                          <span className={`rounded px-2 py-0.5 font-semibold ${estProt.bg}`}>
                            {estProt.emoji} Proteínas/día: {estProt.label}
                          </span>
                          {bajos > 0 ? (
                            <span className="bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded px-2 py-0.5 font-semibold">
                              ⚠️ {bajos} vitaminas/minerales bajos
                            </span>
                          ) : (
                            <span className="bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 rounded px-2 py-0.5 font-semibold">
                              ✅ Vitaminas y minerales cubiertos
                            </span>
                          )}
                          {excesos.length > 0 && (
                            <span className="bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 rounded px-2 py-0.5 font-semibold">
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
                                informeTab === 'cientifico' ? 'bg-blue-700 text-white' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                              }`}
                            >
                              🔬 Científico
                            </button>
                            <button
                              onClick={() => setInformeTab((t) => (t === 'hildegardiano' ? null : 'hildegardiano'))}
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                informeTab === 'hildegardiano' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                              }`}
                            >
                              🌿 Hildegardiano
                            </button>
                          </div>
                        </div>

                        {/* Detalle científico del plan (promedio diario) */}
                        {informeTab === 'cientifico' && (
                          <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-3">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Promedio por día a lo largo de los {dias} días del plan, para una persona.
                            </p>

                            {[
                              { l: 'Calorías', val: calProm, meta: VDR_DIA.calorias, u: 'kcal', pct: pctCal, est: estCal },
                              { l: 'Proteínas', val: protProm, meta: VDR_DIA.proteinas, u: 'g', pct: pctProt, est: estProt },
                            ].map((g) => (
                              <div key={g.l} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-blue-100 dark:border-blue-900">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{g.l} (promedio diario)</span>
                                  <span className={`text-xs font-semibold rounded px-2 py-0.5 ${g.est.bg}`}>
                                    {g.est.emoji} {g.est.label}
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                                  <div className={`h-full ${g.est.bar}`} style={{ width: `${Math.min(g.pct, 100)}%` }} />
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                  En promedio <strong>{g.val.toLocaleString('es-AR', { maximumFractionDigits: 0 })} {g.u}</strong> por
                                  día de los <strong>{g.meta} {g.u}</strong> recomendados — {vecesTexto(g.pct)}.
                                </p>
                              </div>
                            ))}

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-blue-100">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">🧪 Vitaminas y minerales</p>
                              {ausentes.length === 0 && insuficientes.length === 0 ? (
                                <p className="text-xs text-green-700">
                                  ✅ El plan cubre bien las vitaminas y minerales principales.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {ausentes.length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-700 dark:text-gray-200 mb-1">
                                        En todo el plan <strong>nunca aparecen</strong>:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {ausentes.map((k) => (
                                          <span
                                            key={k}
                                            className="bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded px-2 py-0.5 text-xs font-semibold"
                                          >
                                            {NUTRIENTE_META[k].l}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {insuficientes.length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-700 dark:text-gray-200 mb-1">
                                        En promedio hay <strong>muy poca cantidad</strong> de (menos de la mitad de lo recomendado):
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {insuficientes.map((k) => (
                                          <span
                                            key={k}
                                            className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 rounded px-2 py-0.5 text-xs font-semibold"
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
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-orange-200 dark:border-orange-900">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">⚠️ En exceso</p>
                                <p className="text-xs text-gray-700 dark:text-gray-200 mb-1">
                                  En promedio, el plan tiene <strong>más de lo recomendado</strong> de:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {excesos.map((k) => (
                                    <span
                                      key={k}
                                      className="bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200 rounded px-2 py-0.5 text-xs font-semibold"
                                    >
                                      {NUTRIENTE_META[k].l}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                  Conviene no abusar de la sal (sodio), el azúcar y las grasas saturadas.
                                </p>
                              </div>
                            )}

                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
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
                            <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-3 text-xs text-gray-700 dark:text-gray-200">
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                Según la alimentación de <strong>Santa Hildegarda de Bingen</strong>, en todo el plan.
                              </p>

                              <div className={`rounded-lg px-3 py-2 font-semibold ${verdicto.bg}`}>
                                {verdicto.emoji} {verdicto.label}
                              </div>

                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100 dark:border-emerald-900">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">🌡️ ¿Calienta o refresca?</p>
                                {(ar.porcCalido > 0 || ar.porcFrio > 0) ? (
                                  <div className="w-full h-5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700 mb-1">
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
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Sin datos suficientes.</p>
                                )}
                                <p className="text-xs text-gray-600 dark:text-gray-300">{tempTexto}</p>
                              </div>

                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">🌿 Frescura y energía vital</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">{viridTexto}</p>
                              </div>

                              <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-emerald-100 space-y-1">
                                {ar.pilares.length > 0 && (
                                  <p className="text-emerald-800 dark:text-emerald-200 text-xs">
                                    <strong>✨ Incluye pilares del bienestar:</strong> {ar.pilares.join(', ')}.
                                  </p>
                                )}
                                {ar.venenos.length > 0 ? (
                                  <p className="text-red-700 dark:text-red-300 text-xs">
                                    <strong>⚠️ Contiene ingredientes que Hildegarda desaconseja:</strong> {ar.venenos.join(', ')}.
                                  </p>
                                ) : (
                                  <p className="text-green-700 dark:text-green-300 text-xs">✅ No contiene ingredientes desaconsejados.</p>
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

      {/* 🛒 Lista de compras (colapsada): platos a preparar, recetas escalables por porciones e ingredientes por día */}
      {produccionPorDia.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-8">
          <details className="bg-white dark:bg-gray-800 rounded-xl shadow-md group">
            <summary className="cursor-pointer p-4 font-bold text-gray-800 dark:text-gray-100 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
              <span>
                🛒 Lista de compras ({fechas.length} días) de{' '}
                {parseFechaLocal(fechaInicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} a{' '}
                {parseFechaLocal(fechaFin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-sm transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="border-t">
              <ProduccionPorDia dias={produccionPorDia} />
            </div>
          </details>
        </div>
      )}

      {/* MODAL: confirmación de limpiar día */}
      {diaALimpiar && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => !cargando && setDiaALimpiar(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">🧹 Limpiar día completo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {parseFechaLocal(diaALimpiar).toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Se eliminarán todos los platos seleccionados de este día. Esta acción no se puede deshacer.
              </p>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => setDiaALimpiar(null)}
                  disabled={cargando}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => limpiarDia(diaALimpiar)}
                  disabled={cargando}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cargando ? 'Limpiando...' : 'Sí, limpiar día'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE PLATOS CON BUSCADOR */}
      {modalAbierto && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setModalAbierto(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[calc(100vh-0.5rem)] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-700 to-orange-600 text-white p-4 sm:p-6 rounded-t-2xl z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Seleccioná {TIPOS_COMIDA.find((t) => t.id === modalAbierto.tipo)?.label}
                  </h2>
                  <p className="text-amber-100 mt-1">
                    {parseFechaLocal(modalAbierto.fecha).toLocaleDateString('es-AR', {
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
            <div className="sticky top-[98px] sm:top-[120px] bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 p-3 sm:p-4 z-10">
              {/* Barra de búsqueda */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={textoBusqueda}
                    onChange={(e) => setTextoBusqueda(e.target.value)}
                    placeholder="🔍 Buscar por nombre o ingrediente..."
                    className="w-full px-4 py-2 pl-10 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">🔍</span>
                </div>
                {hayFiltros && (
                  <button
                    onClick={() => {
                      setTextoBusqueda('');
                      setCategoriaFiltro(null);
                      setTemperamentoFiltro('');
                      setSoloSinVenenos(false);
                    }}
                    className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-semibold border border-gray-300 dark:border-gray-600"
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
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">🌿 Todos los temperamentos</option>
                  {TEMPERAMENTOS.map((temp) => (
                    <option key={temp.valor} value={temp.valor}>
                      {temp.nombre}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 px-3 py-2 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={soloSinVenenos}
                    onChange={(e) => setSoloSinVenenos(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">🚫 Sin venenos</span>
                </label>
              </div>

              {/* Resumen de resultados */}
              <div className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                Mostrando <strong>{getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).length}</strong> platos disponibles
              </div>
            </div>

            {/* Lista de platos */}
            <div className="p-4 sm:p-6">
              {getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">😕 No hay platos con estos filtros</p>
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
                      <div key={plato.id} className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">{plato.nombre}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{plato.descripcion}</p>
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
                              className={`font-semibold py-2 rounded-lg text-xs sm:text-sm ${vista === 'receta' ? 'bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            >
                              📖 Receta
                            </button>
                          )}
                          {plato.receta && (
                            <button
                              onClick={() => abrir('cientifico')}
                              className={`font-semibold py-2 rounded-lg text-xs sm:text-sm ${vista === 'cientifico' ? 'bg-blue-700 text-white' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}
                            >
                              🔬 Científico
                            </button>
                          )}
                          {plato.receta && (
                            <button
                              onClick={() => abrir('hildegardiano')}
                              className={`font-semibold py-2 rounded-lg text-xs sm:text-sm ${vista === 'hildegardiano' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'}`}
                            >
                              🌿 Hildegardiano
                            </button>
                          )}
                        </div>

                        {/* Sección: Receta */}
                        {vista === 'receta' && plato.receta && (
                          <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {plato.receta.porciones ? `${plato.receta.porciones} porciones` : ''}
                              {plato.receta.tiempo_min ? ` · ${plato.receta.tiempo_min} min` : ''}
                              {plato.receta.dificultad ? ` · ${plato.receta.dificultad}` : ''}
                            </p>
                            {plato.receta.ingredientes && plato.receta.ingredientes.length > 0 && (
                              <>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Ingredientes</p>
                                <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-0.5 mb-2">
                                  {plato.receta.ingredientes.map((ri, i) => (
                                    <li key={i} className="flex justify-between gap-2">
                                      <span>
                                        {ri.ingrediente?.nombre}
                                        {ri.ingrediente?.es_veneno_hildegardiano && (
                                          <span className="text-red-600 ml-1" title="Veneno hildegardiano">⚠️</span>
                                        )}
                                      </span>
                                      {(ri.cantidad || ri.unidad) && (
                                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{ri.cantidad} {ri.unidad}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {plato.receta.pasos && plato.receta.pasos.length > 0 && (
                              <>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Preparación</p>
                                <ol className="text-xs text-gray-700 dark:text-gray-200 list-decimal list-inside space-y-0.5">
                                  {plato.receta.pasos.map((paso, i) => (
                                    <li key={i}>{textoDePaso(paso)}</li>
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
                          <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">🔬 Análisis nutricional científico</p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
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
                                <div key={m.k} className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center border border-blue-100">
                                  <p className={`text-base font-bold ${m.c}`}>
                                    {(a.n[m.k] || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                  </p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{m.l} ({m.u})</p>
                                </div>
                              ))}
                            </div>

                            {/* Tablas agrupadas con barra de % VDR */}
                            {NUTRIENTES_GRUPOS.map((grupo) => (
                              <div key={grupo.titulo}>
                                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 mb-1 mt-1">
                                  {grupo.icono} {grupo.titulo}
                                </p>
                                <div className="overflow-x-auto -mx-1 px-1">
                                  <table className="w-full text-xs text-gray-800 dark:text-gray-100">
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
                                          <tr key={key} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                                            <td className="py-1 pr-2 text-gray-700 dark:text-gray-200 w-1/3">{meta.l}</td>
                                            <td className="py-1 pr-2 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100 w-1/4">
                                              {val.toLocaleString('es-AR', { maximumFractionDigits: 1 })} {meta.u}
                                            </td>
                                            <td className="py-1">
                                              <div className="flex items-center gap-1">
                                                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden min-w-[40px]">
                                                  <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                </div>
                                                <span className="text-[10px] text-gray-600 dark:text-gray-300 whitespace-nowrap w-10 text-right">
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

                            <p className="text-[10px] text-gray-500 dark:text-gray-400 border-t border-blue-200 pt-2">
                              % VDR = porcentaje del valor diario recomendado (dieta de referencia de 2000 kcal).
                              <br />* = límite máximo recomendado (conviene no superarlo).
                            </p>
                          </div>
                        )}

                        {/* Sección: Análisis hildegardiano completo (por porción) */}
                        {vista === 'hildegardiano' && a && (
                          <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">🌿 Análisis hildegardiano (por porción)</p>

                            {/* Interpretación editorial (cargada por el admin) */}
                            {plato.receta?.interpretacion_hildegardiana && (
                              <div className="bg-white dark:bg-gray-800 border border-emerald-200 rounded-lg p-3 text-[11px] text-gray-700 dark:text-gray-200 whitespace-pre-line">
                                {plato.receta.interpretacion_hildegardiana}
                              </div>
                            )}

                            {/* Veredicto según reglas */}
                            <div
                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                a.evaluacion.nivel === 'no_hildegardiano'
                                  ? 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200'
                                  : a.evaluacion.nivel === 'con_precaucion'
                                  ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200'
                                  : a.evaluacion.nivel === 'excelente'
                                  ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200'
                                  : 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200'
                              }`}
                            >
                              {a.evaluacion.veredicto} · {a.evaluacion.puntaje}/100
                            </div>

                            {(a.porcCalido > 0 || a.porcFrio > 0) ? (
                              <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700">
                                <div className="bg-orange-500 h-full flex items-center justify-center text-[9px] text-white" style={{ width: `${a.porcCalido}%` }}>
                                  {a.porcCalido > 15 ? `🔥 ${a.porcCalido.toFixed(0)}%` : ''}
                                </div>
                                <div className="bg-blue-500 h-full flex items-center justify-center text-[9px] text-white" style={{ width: `${a.porcFrio}%` }}>
                                  {a.porcFrio > 15 ? `❄️ ${a.porcFrio.toFixed(0)}%` : ''}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">Sin datos de temperamento</p>
                            )}
                            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mt-1">📊 Cualidades del plato</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-700 dark:text-gray-200">
                              <span>🟢 Viriditas: <strong>{a.viriditas.toFixed(1)}</strong>/10</span>
                              <span>🔥 Cocido: <strong>{a.porcCocido.toFixed(0)}%</strong></span>
                              <span>☀️ Seco: <strong>{a.porcSeco.toFixed(0)}%</strong></span>
                              <span>💧 Húmedo: <strong>{a.porcHumedo.toFixed(0)}%</strong></span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              Viriditas = fuerza vital / frescura del alimento (0 a 10). El equilibrio 🔥/❄️ indica si el plato «calienta» o «enfría» según Hildegarda.
                            </p>

                            {/* Pilares de vigor (reglas por nombre) */}
                            {a.evaluacion.pilares.length > 0 && (
                              <div className="text-[11px] text-emerald-800 dark:text-emerald-200">
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
                              <div className="text-[11px] text-red-700 dark:text-red-300">
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
                              <div className="text-[11px] text-yellow-800 dark:text-yellow-300">
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
                              <p className="text-[11px] text-amber-800 dark:text-amber-200">
                                🌶️ Especias cálidas (calientan el "frío interior"): {a.evaluacion.especiasCalidas.join(', ')}
                              </p>
                            )}

                            {/* Recomendaciones */}
                            {a.evaluacion.recomendaciones.length > 0 && (
                              <div className="text-[11px] text-gray-700 dark:text-gray-200 border-t border-emerald-200 dark:border-emerald-900 pt-2">
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
                              <div className="border-t border-emerald-200 dark:border-emerald-900 pt-2">
                                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1">🧾 Cualidades por ingrediente</p>
                                <div className="overflow-x-auto -mx-1 px-1">
                                  <table className="w-full text-[11px] text-gray-800 dark:text-gray-100 min-w-[340px]">
                                    <thead>
                                      <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-emerald-300 dark:border-emerald-900">
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
                                            <td className="py-1 pr-2 text-gray-800 dark:text-gray-100">{ing.nombre}</td>
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
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
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

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3">
              <button
                onClick={() => setModalAbierto(null)}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { DIAS_SEMANA, CATEGORIAS_COMIDA } from '@/lib/pedidos';
import { evaluarReceta } from '@/lib/hildegarda';
import AnalisisGrupo from './AnalisisGrupo';
import InformeCompleto from './InformeCompleto';

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
  const todosConfirmaron = miembrosConfirmados === miembrosState.length && miembrosState.length === 4;

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-emerald-50">
      <header className="bg-gradient-to-r from-teal-700 via-emerald-600 to-green-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold font-serif">📅 Plan de 30 Días</h1>
          <p className="text-teal-100 mt-1">
            {fechas.length} días · {miembrosState.length}/4 miembros · {items.length} platos seleccionados
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

      {/* Análisis nutricional e hildegardiano (en la misma página) */}
      <div className="max-w-6xl mx-auto px-4 pb-4">
        <AnalisisGrupo grupoId={grupoId} refreshKey={analisisVersion} />
      </div>

      {/* Informe completo (hildegardiano detallado + científico) */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <InformeCompleto grupoId={grupoId} refreshKey={analisisVersion} />
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
                    className="w-full px-4 py-2 pl-10 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
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
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
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
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
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
                          <div className="mt-3 bg-blue-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">🔬 Análisis nutricional científico (por porción)</p>
                            <div className="overflow-x-auto -mx-1 px-1">
                              <table className="w-full text-xs min-w-[300px] text-gray-800">
                                <thead>
                                  <tr className="text-left text-gray-600 border-b border-gray-300">
                                    <th className="py-1 pr-2 font-semibold">Nutriente</th>
                                    <th className="py-1 pr-2 font-semibold">Cantidad</th>
                                    <th className="py-1 font-semibold">% VDR</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {NUTRIENTES_LISTA.map((nut) => {
                                    const val = a.n[nut.key] || 0;
                                    const vdr = VDR_DIA[nut.key] || 0;
                                    const pct = vdr ? (val / vdr) * 100 : 0;
                                    return (
                                      <tr key={nut.key} className="border-b border-gray-200 last:border-0">
                                        <td className="py-1 pr-2 text-gray-700">{nut.l}</td>
                                        <td className="py-1 pr-2 whitespace-nowrap font-semibold text-gray-900">
                                          {val.toLocaleString('es-AR', { maximumFractionDigits: 1 })} {nut.u}
                                        </td>
                                        <td className="py-1 whitespace-nowrap font-semibold text-blue-700">
                                          {pct.toFixed(0)}%{VDR_MAX.has(nut.key) ? ' (máx)' : ''}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
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
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-700">
                              <span>🟢 Viriditas: <strong>{a.viriditas.toFixed(1)}</strong>/10</span>
                              <span>🔥 Cocido: <strong>{a.porcCocido.toFixed(0)}%</strong></span>
                              <span>☀️ Seco: <strong>{a.porcSeco.toFixed(0)}%</strong></span>
                              <span>💧 Húmedo: <strong>{a.porcHumedo.toFixed(0)}%</strong></span>
                            </div>

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

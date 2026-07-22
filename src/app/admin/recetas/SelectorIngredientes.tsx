'use client';

import { useState, useEffect, useMemo } from 'react';
import { clasificarIngrediente } from '@/lib/hildegarda';

const CACHE_KEY_INGREDIENTES_SELECTOR = 'admin_recetas_ingredientes_selector_v2';
let ingredientesCacheMemoria: Ingrediente[] | null = null;

interface Ingrediente {
  id: string;
  nombre: string;
  categoria: string;
  unidad_base: string;
  calorias: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  grasas_g: number | null;
  temperamento?: string | null;
  nivel_subtilitat?: number | null;
  es_veneno_hildegardiano?: boolean | null;
  es_base_alegria?: boolean | null;
  requiere_coccion?: boolean | null;
  impacto_livor?: string | null;
  viriditas_index?: string | null;
  humor_principal?: string | null;
  frecuencia_recomendada?: string | null;
  apto_para_enfermos?: boolean | null;
  impacto_bilis_negra?: string | null;
  estacion_ideal?: string | null;
  beneficios_hildegardianos?: string | null;
  contraindicaciones?: string | null;
}

interface IngredienteSeleccionado {
  ingrediente_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface SelectorIngredientesProps {
  value: IngredienteSeleccionado[];
  onChange: (ingredientes: IngredienteSeleccionado[]) => void;
}

interface UnidadOpcion {
  value: string;
  label: string;
  /** cantidad * factor = equivalente en la unidad base (g o ml) */
  factor: number;
  /** Unidad base equivalente (g o ml). */
  equivalente: 'g' | 'ml';
}

// Unidades disponibles con su equivalencia aproximada en gramos o mililitros.
const UNIDADES: UnidadOpcion[] = [
  { value: 'gramos', label: 'gramos', factor: 1, equivalente: 'g' },
  { value: 'kg', label: 'kg', factor: 1000, equivalente: 'g' },
  { value: 'ml', label: 'ml', factor: 1, equivalente: 'ml' },
  { value: 'litros', label: 'litros', factor: 1000, equivalente: 'ml' },
  { value: 'unidades', label: 'unidades', factor: 100, equivalente: 'g' },
  { value: 'cucharadas', label: 'cucharadas', factor: 15, equivalente: 'g' },
  { value: 'cucharadas_liquida', label: 'cucharadas líquida', factor: 15, equivalente: 'ml' },
  { value: 'cucharadita', label: 'cucharadita', factor: 5, equivalente: 'g' },
  { value: 'cucharadita_liquida', label: 'cucharadita líquida', factor: 5, equivalente: 'ml' },
  { value: 'tazas', label: 'tazas líquido', factor: 240, equivalente: 'ml' },
  { value: 'tazas_peso', label: 'tazas peso', factor: 200, equivalente: 'g' },
  { value: 'punado', label: 'puñado', factor: 30, equivalente: 'g' },
  { value: 'punta_cuchillo', label: 'punta de cuchillo', factor: 0.5, equivalente: 'g' },
  { value: 'pizca', label: 'pizca', factor: 0.5, equivalente: 'g' },
  { value: 'diente', label: 'diente', factor: 5, equivalente: 'g' },
];

/** Devuelve el texto de equivalencia (ej: "≈ 1500 g") o null si la unidad es desconocida. */
function equivalenteTexto(cantidad: number, unidadValue: string): string | null {
  const u = UNIDADES.find((x) => x.value === unidadValue);
  if (!u) return null;
  const cantidadNum = typeof cantidad === 'number' ? cantidad : parseFloat(cantidad);
  const base = Number.isFinite(cantidadNum) ? cantidadNum : 0;
  const total = base * u.factor;
  const valor = Math.round(total * 100) / 100;
  // Para las unidades base (factor 1) usamos "=" y para las convertidas "≈".
  const simbolo = u.factor === 1 ? '=' : '≈';
  return `${simbolo} ${valor} ${u.equivalente}`;
}

interface AdvertenciaHildegardiana {
  tipo: string;
  icono: string;
  texto: string;
  clases: string;
}

interface ResumenHildegardiano {
  /** Semáforo general del ingrediente. */
  estado: {
    nivel: 'recomendado' | 'precaucion' | 'evitar';
    icono: string;
    texto: string;
    clases: string;
  };
  /** Datos informativos neutros (viriditas, subtilitat, temperamento, frecuencia). */
  datos: AdvertenciaHildegardiana[];
  /** Alertas reales (amarillo/rojo). */
  alertas: AdvertenciaHildegardiana[];
  /** Beneficios destacados (verde). */
  beneficios: AdvertenciaHildegardiana[];
}

const CLASES = {
  rojo: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border border-red-200 dark:border-red-800',
  ambar:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800',
  verde:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border border-green-200 dark:border-green-800',
  naranja:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 border border-orange-200 dark:border-orange-800',
  lima: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200 border border-lime-200 dark:border-lime-800',
  azul: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-200 dark:border-blue-800',
  gris: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600',
  violeta:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 border border-purple-200 dark:border-purple-800',
} as const;

const VIRIDITAS_ETIQUETA: Record<string, { texto: string; clases: string }> = {
  maximo: { texto: 'Viriditas máxima', clases: CLASES.verde },
  alto: { texto: 'Viriditas alta', clases: CLASES.verde },
  moderado: { texto: 'Viriditas moderada', clases: CLASES.lima },
  bajo: { texto: 'Viriditas baja', clases: CLASES.ambar },
  nulo: { texto: 'Viriditas nula', clases: CLASES.rojo },
};

const FRECUENCIA_ETIQUETA: Record<string, { texto: string; clases: string }> = {
  diario: { texto: 'Uso diario', clases: CLASES.verde },
  ocasional: { texto: 'Uso ocasional', clases: CLASES.azul },
  medicinal: { texto: 'Solo medicinal', clases: CLASES.violeta },
  prohibido: { texto: 'Prohibido', clases: CLASES.rojo },
};

const TEMPERAMENTO_ETIQUETA: Record<string, string> = {
  calido: 'Cálido',
  frio: 'Frío',
  templado: 'Templado',
  neutro: 'Neutro',
  frio_suave: 'Frío suave',
  calido_suave: 'Cálido suave',
  calido_seco: 'Cálido y seco',
  calido_humedo: 'Cálido y húmedo',
  frio_seco: 'Frío y seco',
  frio_humedo: 'Frío y húmedo',
};

/**
 * Genera el resumen hildegardiano de un ingrediente combinando los campos de la
 * base de datos con la clasificación por nombre.
 *
 * Estructura la información en 4 grupos con jerarquía clara:
 *  1. estado: un semáforo general (verde/amarillo/rojo).
 *  2. datos: información neutra (viriditas, subtilitat, temperamento, frecuencia).
 *  3. alertas: motivos de precaución o rechazo (amarillo/rojo).
 *  4. beneficios: virtudes destacadas (verde).
 */
function resumenHildegardiano(ingrediente?: Ingrediente, nombre?: string): ResumenHildegardiano {
  const nom = ingrediente?.nombre || nombre || '';
  const c = clasificarIngrediente(nom);

  const datos: AdvertenciaHildegardiana[] = [];
  const alertas: AdvertenciaHildegardiana[] = [];
  const beneficios: AdvertenciaHildegardiana[] = [];

  const esVeneno = !!(ingrediente?.es_veneno_hildegardiano || c.veneno);
  const viriditas = ingrediente?.viriditas_index || null;
  const subtilitat = ingrediente?.nivel_subtilitat ?? null;
  const frecuencia = ingrediente?.frecuencia_recomendada || null;
  const contraindicacion = ingrediente?.contraindicaciones?.trim() || c.precaucion || '';

  // ---- DATOS NEUTROS (siempre en gris para que no compitan con las alertas) ----
  if (viriditas && VIRIDITAS_ETIQUETA[viriditas]) {
    datos.push({ tipo: 'viriditas', icono: '🌿', texto: VIRIDITAS_ETIQUETA[viriditas].texto, clases: CLASES.gris });
  }
  if (subtilitat != null) {
    // El Subtilitat es el indicador principal: se colorea según su nivel.
    const clasesSub = subtilitat > 6 ? CLASES.verde : subtilitat >= 4 ? CLASES.ambar : CLASES.rojo;
    datos.push({ tipo: 'subtilitat', icono: '✨', texto: `Subtilitat ${subtilitat}/10`, clases: clasesSub });
  }
  if (ingrediente?.temperamento) {
    datos.push({
      tipo: 'temperamento',
      icono: '🌡️',
      texto: TEMPERAMENTO_ETIQUETA[ingrediente.temperamento] || ingrediente.temperamento,
      clases: CLASES.gris,
    });
  }
  if (frecuencia && FRECUENCIA_ETIQUETA[frecuencia]) {
    datos.push({ tipo: 'frecuencia', icono: '📅', texto: FRECUENCIA_ETIQUETA[frecuencia].texto, clases: CLASES.gris });
  }

  // ---- ALERTAS (motivos concretos) ----
  if (esVeneno) {
    alertas.push({
      tipo: 'veneno',
      icono: '🚫',
      texto: c.razonVeneno ? `Veneno de cocina: ${c.razonVeneno}` : 'Veneno de cocina',
      clases: CLASES.rojo,
    });
  }
  if (frecuencia === 'prohibido' && !esVeneno) {
    alertas.push({ tipo: 'prohibido', icono: '⛔', texto: 'Uso prohibido', clases: CLASES.rojo });
  }
  if (contraindicacion) {
    alertas.push({ tipo: 'contraindicacion', icono: '⚠️', texto: `Contraindicación: ${contraindicacion}`, clases: CLASES.ambar });
  }
  if (ingrediente?.requiere_coccion) {
    alertas.push({ tipo: 'coccion', icono: '🔥', texto: 'Requiere cocción', clases: CLASES.ambar });
  }
  if (ingrediente?.apto_para_enfermos === false) {
    alertas.push({ tipo: 'enfermos', icono: '🤒', texto: 'No apto para enfermos', clases: CLASES.ambar });
  }

  // ---- BENEFICIOS ----
  if (c.pilar) {
    beneficios.push({ tipo: 'pilar', icono: '🏛️', texto: `Pilar de vigor: ${c.pilar}`, clases: CLASES.verde });
  }
  if (ingrediente?.es_base_alegria) {
    beneficios.push({ tipo: 'alegria', icono: '😊', texto: 'Base de alegría', clases: CLASES.verde });
  }
  if (c.especiaCalida) {
    beneficios.push({ tipo: 'especia', icono: '🌶️', texto: 'Especia cálida', clases: CLASES.verde });
  }

  // ---- SEMÁFORO GENERAL ----
  // El Subtilitat es el indicador más confiable: cuando existe, manda.
  //   >6  → recomendado (verde) · 4-6 → precaución (amarillo) · <4 → evitar (rojo)
  // Excepción de seguridad: los venenos y lo prohibido siempre son rojos.
  // Si no hay Subtilitat, se usa la viriditas / alertas como respaldo.
  let nivel: ResumenHildegardiano['estado']['nivel'];

  if (esVeneno || frecuencia === 'prohibido') {
    nivel = 'evitar';
  } else if (subtilitat != null) {
    nivel = subtilitat > 6 ? 'recomendado' : subtilitat >= 4 ? 'precaucion' : 'evitar';
  } else {
    const esRojo = viriditas === 'nulo';
    const esAmarillo =
      !esRojo && (alertas.length > 0 || viriditas === 'bajo' || frecuencia === 'medicinal');
    nivel = esRojo ? 'evitar' : esAmarillo ? 'precaucion' : 'recomendado';
  }

  const estado: ResumenHildegardiano['estado'] =
    nivel === 'evitar'
      ? { nivel: 'evitar', icono: '🚫', texto: 'Evitar', clases: CLASES.rojo }
      : nivel === 'precaucion'
      ? { nivel: 'precaucion', icono: '⚠️', texto: 'Usar con precaución', clases: CLASES.ambar }
      : { nivel: 'recomendado', icono: '✅', texto: 'Recomendado', clases: CLASES.verde };

  return { estado, datos, alertas, beneficios };
}

const CATEGORIAS_ETIQUETAS: Record<string, string> = {
  verduras: '🥕 Verduras',
  frutas: '🍎 Frutas',
  carnes: '🥩 Carnes',
  pescados: '🐟 Pescados',
  lacteos: '🧀 Lácteos',
  granos: '🌾 Granos',
  legumbres: '🫘 Legumbres',
  bebidas: '🥤 Bebidas',
  condimentos: '🧂 Condimentos',
  especias: '🌶️ Especias',
  aceites: '🫒 Aceites',
  hierbas: '🌿 Hierbas',
  frutos_secos: '🥜 Frutos Secos',
  huevos: '🥚 Huevos',
  conservas: '🥫 Conservas',
  endulzantes: '🍯 Endulzantes',
  otros: '📦 Otros',
};

const CATEGORIAS_ORDEN = [
  'verduras',
  'frutas',
  'carnes',
  'pescados',
  'lacteos',
  'granos',
  'legumbres',
  'bebidas',
  'condimentos',
  'especias',
  'aceites',
  'hierbas',
  'frutos_secos',
  'huevos',
  'conservas',
  'endulzantes',
  'otros',
];

const CATEGORIAS_EQUIVALENTES: Record<string, string> = {
  bebida: 'bebidas',
  bebidas: 'bebidas',
  lacteo: 'lacteos',
  lacteos: 'lacteos',
  lácteo: 'lacteos',
  lácteos: 'lacteos',
  legumbre: 'legumbres',
  legumbres: 'legumbres',
  fruto_seco: 'frutos_secos',
  frutos_secos: 'frutos_secos',
  fruto_secos: 'frutos_secos',
  especia: 'especias',
  especias: 'especias',
  hierba: 'hierbas',
  hierbas: 'hierbas',
  condimento: 'condimentos',
  condimentos: 'condimentos',
  endulzante: 'endulzantes',
  endulzantes: 'endulzantes',
};

function normalizarCategoriaId(categoria: string | null | undefined): string {
  if (!categoria) return 'otros';

  const base = categoria
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');

  return CATEGORIAS_EQUIVALENTES[base] || base;
}

function normalizarTextoBusqueda(valor: string): string {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatearCategoria(id: string): string {
  if (CATEGORIAS_ETIQUETAS[id]) return CATEGORIAS_ETIQUETAS[id];

  const nombre = id
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return `📦 ${nombre || 'Otros'}`;
}

export default function SelectorIngredientes({ value, onChange }: SelectorIngredientesProps) {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [cargandoIngredientes, setCargandoIngredientes] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState<Ingrediente | null>(null);
  const [cantidad, setCantidad] = useState(100);
  const [unidad, setUnidad] = useState('gramos');

  // Cargar ingredientes
  useEffect(() => {
    const cargar = async () => {
      let usadoCache = false;

      try {
        if (ingredientesCacheMemoria) {
          setIngredientes(ingredientesCacheMemoria);
          usadoCache = true;
        }

        if (!usadoCache && typeof window !== 'undefined') {
          const guardado = window.sessionStorage.getItem(CACHE_KEY_INGREDIENTES_SELECTOR);
          if (guardado) {
            const parsed = JSON.parse(guardado);
            if (Array.isArray(parsed)) {
              ingredientesCacheMemoria = parsed;
              setIngredientes(parsed);
              usadoCache = true;
            }
          }
        }

        if (usadoCache) {
          // Si ya mostramos cache, no bloqueamos la UI mientras revalidamos en segundo plano.
          setCargandoIngredientes(false);
        }

        const res = await fetch('/api/admin/ingredientes?categoria=todos&incluir_inactivos=1&vista=selector');
        const data = await res.json();
        const lista = data.ingredientes || [];
        setIngredientes(lista);
        ingredientesCacheMemoria = lista;

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(CACHE_KEY_INGREDIENTES_SELECTOR, JSON.stringify(lista));
        }
      } catch {
        if (!usadoCache) {
          setIngredientes([]);
        }
      } finally {
        if (!usadoCache) {
          setCargandoIngredientes(false);
        }
      }
    };
    cargar();
  }, []);

  // Filtrar ingredientes
  const ingredientesFiltrados = ingredientes.filter((ing) => {
    const termino = normalizarTextoBusqueda(busqueda);
    const nombre = normalizarTextoBusqueda(ing.nombre || '');
    const matchBusqueda = !termino || nombre.includes(termino);
    const categoriaNormalizada = normalizarCategoriaId(ing.categoria);
    const matchCategoria = categoriaFiltro === 'todos' || categoriaNormalizada === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  // Agregar ingrediente a la receta
  const agregarIngrediente = (ingrediente: Ingrediente, cantidadInicial: number, unidadInicial: string) => {
    const nuevo: IngredienteSeleccionado = {
      ingrediente_id: ingrediente.id,
      nombre: ingrediente.nombre,
      cantidad: cantidadInicial,
      unidad: unidadInicial,
    };

    // Verificar si ya existe
    if (value.some((i) => i.ingrediente_id === nuevo.ingrediente_id)) {
      alert('Este ingrediente ya está en la receta');
      return;
    }

    onChange([...value, nuevo]);
    setIngredienteSeleccionado(null);
    setCantidad(100);
    setUnidad('gramos');
    setBusqueda('');
    setMostrarResultados(false);
  };

  // Eliminar ingrediente
  const eliminarIngrediente = (id: string) => {
    onChange(value.filter((i) => i.ingrediente_id !== id));
  };

  // Actualizar cantidad
  const actualizarCantidad = (id: string, nuevaCantidad: number) => {
    onChange(value.map((i) => (i.ingrediente_id === id ? { ...i, cantidad: nuevaCantidad } : i)));
  };

  const actualizarUnidad = (id: string, nuevaUnidad: string) => {
    onChange(value.map((i) => (i.ingrediente_id === id ? { ...i, unidad: nuevaUnidad } : i)));
  };

  // Calcular nutrición total
  const calcularNutricion = () => {
    let calorias = 0;
    let proteinas = 0;
    let carbs = 0;
    let grasas = 0;

    value.forEach((item) => {
      const ing = ingredientes.find((i) => i.id === item.ingrediente_id);
      if (!ing) return;

      // Calcular factor (cantidad / 100g)
      const factor = item.cantidad / 100;
      calorias += (ing.calorias || 0) * factor;
      proteinas += (ing.proteinas_g || 0) * factor;
      carbs += (ing.carbohidratos_g || 0) * factor;
      grasas += (ing.grasas_g || 0) * factor;
    });

    return { calorias, proteinas, carbs, grasas };
  };

  const nutricion = calcularNutricion();

  const categorias = useMemo(() => {
    const conteosPorCategoria = ingredientes.reduce<Record<string, number>>((acc, ing) => {
      const categoria = normalizarCategoriaId(ing.categoria);
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, {});

    const categoriasUnicas = Array.from(new Set(ingredientes.map((ing) => normalizarCategoriaId(ing.categoria))));

    const categoriasOrdenadas = categoriasUnicas.sort((a, b) => {
      const indexA = CATEGORIAS_ORDEN.indexOf(a);
      const indexB = CATEGORIAS_ORDEN.indexOf(b);

      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b, 'es');
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return [
      { id: 'todos', nombre: `📋 Todas (${ingredientes.length})` },
      ...categoriasOrdenadas.map((id) => ({
        id,
        nombre: `${formatearCategoria(id)} (${conteosPorCategoria[id] || 0})`,
      })),
    ];
  }, [ingredientes]);

  return (
    <div className="space-y-4">
      {/* Buscador de ingredientes */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">🔍 Agregar Ingrediente</h3>
        {cargandoIngredientes && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Cargando catálogo de ingredientes…</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setMostrarResultados(true);
            }}
            onFocus={() => setMostrarResultados(true)}
            placeholder="Buscar ingrediente..."
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
          />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setBusqueda(''); setCategoriaFiltro('todos'); }}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Limpiar
          </button>
        </div>

        {/* Resultados de búsqueda */}
        {mostrarResultados && busqueda.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto mb-3">
            {ingredientesFiltrados.slice(0, 20).map((ing) => (
              <button
                key={ing.id}
                type="button"
                onClick={() => {
                  const unidadBase = ing.unidad_base || 'gramos';
                  agregarIngrediente(ing, 100, unidadBase);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-green-50 border-b last:border-b-0 text-gray-900 dark:text-gray-100 ${
                  ingredienteSeleccionado?.id === ing.id ? 'bg-green-100' : 'bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{ing.nombre}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {ing.calorias !== null ? `${ing.calorias} kcal` : 'Sin datos'}
                  </span>
                </div>
              </button>
            ))}
            {ingredientesFiltrados.length === 0 && (
              <p className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">No se encontraron ingredientes</p>
            )}
          </div>
        )}

        {/* Formulario de cantidad */}
        {ingredienteSeleccionado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="font-semibold text-green-800 mb-2">
              ✓ Seleccionado: {ingredienteSeleccionado.nombre}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Cantidad</label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Unidad</label>
                <select
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                {equivalenteTexto(cantidad, unidad) && (
                  <p className="text-xs text-green-700 dark:text-green-400 font-semibold mt-1">
                    {equivalenteTexto(cantidad, unidad)}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!ingredienteSeleccionado) return;
                agregarIngrediente(ingredienteSeleccionado, cantidad, unidad);
              }}
              className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
            >
              ➕ Agregar a la receta
            </button>
          </div>
        )}
      </div>

      {/* Lista de ingredientes seleccionados */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
          🥕 Ingredientes de la Receta ({value.length})
        </h3>

        {value.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">Aún no hay ingredientes</p>
        ) : (
          <div className="space-y-2">
            {value.map((item) => (
              <div key={item.ingrediente_id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{item.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => actualizarCantidad(item.ingrediente_id, parseFloat(e.target.value) || 0)}
                      step="0.1"
                      className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    />
                    <select
                      value={item.unidad}
                      onChange={(e) => actualizarUnidad(item.ingrediente_id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                    {equivalenteTexto(item.cantidad, item.unidad) && (
                      <span className="text-xs text-green-700 dark:text-green-400 font-semibold whitespace-nowrap">
                        {equivalenteTexto(item.cantidad, item.unidad)}
                      </span>
                    )}
                  </div>
                  {/* Resumen hildegardiano */}
                  {(() => {
                    const ingredienteFull = ingredientes.find((i) => i.id === item.ingrediente_id);
                    const resumen = resumenHildegardiano(ingredienteFull, item.nombre);
                    return (
                      <div className="mt-2 space-y-1.5">
                        {/* Semáforo general */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${resumen.estado.clases}`}
                            title="Estado hildegardiano general"
                          >
                            {resumen.estado.icono} {resumen.estado.texto}
                          </span>
                          {/* Datos neutros */}
                          {resumen.datos.map((d, idx) => (
                            <span
                              key={`${item.ingrediente_id}-${d.tipo}-${idx}`}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.clases}`}
                              title={d.texto}
                            >
                              {d.icono} {d.texto}
                            </span>
                          ))}
                        </div>

                        {/* Alertas */}
                        {resumen.alertas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {resumen.alertas.map((a, idx) => (
                              <span
                                key={`${item.ingrediente_id}-${a.tipo}-${idx}`}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.clases}`}
                                title={a.texto}
                              >
                                {a.icono} {a.texto}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Beneficios */}
                        {resumen.beneficios.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {resumen.beneficios.map((b, idx) => (
                              <span
                                key={`${item.ingrediente_id}-${b.tipo}-${idx}`}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.clases}`}
                                title={b.texto}
                              >
                                {b.icono} {b.texto}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => eliminarIngrediente(item.ingrediente_id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen nutricional */}
      {value.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-bold text-amber-800 mb-3">📊 Nutrición Total de la Receta</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300">🔥 Calorías</p>
              <p className="text-xl font-bold text-amber-600">{nutricion.calorias.toFixed(0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">kcal</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300">💪 Proteínas</p>
              <p className="text-xl font-bold text-blue-600">{nutricion.proteinas.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">g</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300">🍞 Carbohidratos</p>
              <p className="text-xl font-bold text-orange-600">{nutricion.carbs.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">g</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded p-3 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300">🥑 Grasas</p>
              <p className="text-xl font-bold text-yellow-600">{nutricion.grasas.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">g</p>
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-2 italic">
            * Valores calculados según las cantidades seleccionadas
          </p>
        </div>
      )}
    </div>
  );
}

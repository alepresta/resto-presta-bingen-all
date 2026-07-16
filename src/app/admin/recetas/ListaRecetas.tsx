'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DeleteButton from './DeleteButton';
import type { AnalisisPlato } from '@/lib/analisis-plato';

interface Ingrediente {
  id: string;
  nombre: string;
  temperamento: string | null;
  es_veneno_hildegardiano: boolean;
  es_base_alegria: boolean;
}

interface RecetaItem {
  id: string;
  nombrePlato: string;
  categoria_id: number;
  disponible: boolean;
  precio: number | null;
  dia_semana_id: number | null;
  alergenos?: string[] | null;
  tiempo_min: number | null;
  porciones: number | null;
  dificultad: string | null;
  numIngredientes: number;
  numPasos: number;
  notas: string | null;
  ingredientes?: Array<{ ingrediente: Ingrediente }>;
  analisis?: AnalisisPlato | null;
  indiceGlucemico?: number | null;
}

interface ListaRecetasProps {
  recetas: RecetaItem[];
  totalRecetas: number;
  platosSinReceta: number;
  cobertura: number;
  error: string | null;
}

const CATEGORIAS: Record<number, { nombre: string; icono: string }> = {
  1: { nombre: 'Desayuno', icono: '☕' },
  2: { nombre: 'Plato Principal', icono: '🍽️' },
  3: { nombre: 'Guarnición', icono: '🥗' },
  4: { nombre: 'Bebida', icono: '🥤' },
  5: { nombre: 'Postre', icono: '🍰' },
};

const DIAS_SEMANA: Array<{ id: number; nombre: string; icono: string }> = [
  { id: 1, nombre: 'Lunes', icono: '🥩' },
  { id: 2, nombre: 'Martes', icono: '🥗' },
  { id: 3, nombre: 'Miércoles', icono: '🍝' },
  { id: 4, nombre: 'Jueves', icono: '🍗' },
  { id: 5, nombre: 'Viernes', icono: '🐟' },
  { id: 6, nombre: 'Sábado', icono: '🍕' },
  { id: 7, nombre: 'Domingo', icono: '🍝' },
];

const TEMPERAMENTOS = [
  { valor: 'calido', nombre: '🌡️ Cálido', color: 'bg-orange-100 text-orange-700' },
  { valor: 'calido_seco', nombre: '🔥 Cálido-Seco', color: 'bg-red-100 text-red-700' },
  { valor: 'calido_humedo', nombre: '🌊 Cálido-Húmedo', color: 'bg-amber-100 text-amber-700' },
  { valor: 'frio', nombre: '❄️ Frío', color: 'bg-blue-100 text-blue-700' },
  { valor: 'frio_seco', nombre: '🍃 Frío-Seco', color: 'bg-cyan-100 text-cyan-700' },
  { valor: 'frio_humedo', nombre: '💧 Frío-Húmedo', color: 'bg-teal-100 text-teal-700' },
];

const UMBRAL_FUENTE = 15;

const VITAMINAS: Array<{ clave: string; label: string }> = [
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

const MINERALES: Array<{ clave: string; label: string }> = [
  { clave: 'calcio', label: 'Calcio' },
  { clave: 'hierro', label: 'Hierro' },
  { clave: 'magnesio', label: 'Magnesio' },
  { clave: 'potasio', label: 'Potasio' },
  { clave: 'zinc', label: 'Zinc' },
  { clave: 'fosforo', label: 'Fósforo' },
];

function nombreDia(id: number | null): string {
  if (id === null) return 'Todos los días';
  return DIAS_SEMANA.find((d) => d.id === id)?.nombre ?? 'Todos los días';
}

function etiquetaDiaFiltro(valor: string): string | null {
  if (!valor) return null;
  if (valor === 'todos_dias') return 'Dia: Todos los dias';
  const dia = DIAS_SEMANA.find((d) => String(d.id) === valor);
  return dia ? `Dia: ${dia.nombre}` : null;
}

function formatoPrecio(precio: number | null): string {
  if (precio === null || precio === undefined || precio <= 0) return 'Gratis';
  return `$${precio.toLocaleString('es-AR')}`;
}

function tieneGluten(r: RecetaItem): boolean {
  return (r.alergenos || []).some((a) => /gluten|trigo|cebada|centeno|avena|espelta/i.test(a));
}

function categoriaIG(ig: number | null | undefined): 'bajo' | 'medio' | 'alto' | null {
  if (ig === null || ig === undefined) return null;
  if (ig <= 55) return 'bajo';
  if (ig <= 69) return 'medio';
  return 'alto';
}

const IG_INFO: Record<'bajo' | 'medio' | 'alto', { label: string; color: string }> = {
  bajo: { label: 'IG bajo', color: 'bg-green-100 text-green-700' },
  medio: { label: 'IG medio', color: 'bg-yellow-100 text-yellow-700' },
  alto: { label: 'IG alto', color: 'bg-red-100 text-red-700' },
};

function temperamentoDominante(r: RecetaItem): string | null {
  if (!r.ingredientes) return null;
  const temps: Record<string, number> = {};
  r.ingredientes.forEach((ri) => {
    const t = ri.ingrediente?.temperamento;
    if (t) temps[t] = (temps[t] || 0) + 1;
  });
  const entries = Object.entries(temps);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function normalizarTextoBusqueda(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extraerTerminosBusqueda(valor: string): string[] {
  return normalizarTextoBusqueda(valor)
    .split(/\s+/)
    .filter(Boolean)
    .filter((termino) => termino !== 'de' && termino !== 'del' && termino !== 'la' && termino !== 'las' && termino !== 'el' && termino !== 'los' && termino !== 'con');
}

export default function ListaRecetas({ recetas, totalRecetas, platosSinReceta, cobertura, error }: ListaRecetasProps) {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [temperamentoFiltro, setTemperamentoFiltro] = useState<string>('');
  const [soloSinVenenos, setSoloSinVenenos] = useState(false);
  const [soloBaseAlegria, setSoloBaseAlegria] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'publicados' | 'despublicados'>('todos');
  const [precioFiltro, setPrecioFiltro] = useState<'todos' | 'gratis' | 'con_precio'>('todos');
  const [glutenFiltro, setGlutenFiltro] = useState<'todos' | 'con' | 'sin'>('todos');
  const [igFiltro, setIgFiltro] = useState<'todos' | 'bajo' | 'medio' | 'alto'>('todos');
  const [diaFiltro, setDiaFiltro] = useState<string>('');
  const [vitaminasSel, setVitaminasSel] = useState<string[]>([]);
  const [mineralesSel, setMineralesSel] = useState<string[]>([]);
  const [panelNutrientes, setPanelNutrientes] = useState(false);

  const toggleEnLista = (valor: string, lista: string[], setter: (v: string[]) => void) => {
    setter(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  };

  const recetasFiltradas = useMemo(() => {
    return recetas.filter((r) => {
      if (textoBusqueda) {
        const terminos = extraerTerminosBusqueda(textoBusqueda);
        const nombreNormalizado = normalizarTextoBusqueda(r.nombrePlato);
        const ingredientesNormalizados = (r.ingredientes || [])
          .map((ri) => normalizarTextoBusqueda(ri.ingrediente?.nombre || ''))
          .join(' ');
        const textoCompleto = `${nombreNormalizado} ${ingredientesNormalizados}`.trim();
        const coincideNombre = terminos.every((termino) => nombreNormalizado.includes(termino));
        const coincideTextoCompleto = terminos.every((termino) => textoCompleto.includes(termino));
        if (!coincideNombre && !coincideTextoCompleto) return false;
      }

      if (estadoFiltro === 'publicados' && !r.disponible) return false;
      if (estadoFiltro === 'despublicados' && r.disponible) return false;

      const esGratis = r.precio === null || r.precio === undefined || r.precio <= 0;
      if (precioFiltro === 'gratis' && !esGratis) return false;
      if (precioFiltro === 'con_precio' && esGratis) return false;

      if (glutenFiltro === 'con' && !tieneGluten(r)) return false;
      if (glutenFiltro === 'sin' && tieneGluten(r)) return false;

      if (igFiltro !== 'todos' && categoriaIG(r.indiceGlucemico) !== igFiltro) return false;

      if (diaFiltro === 'todos_dias' && r.dia_semana_id !== null) return false;
      if (diaFiltro !== '' && diaFiltro !== 'todos_dias' && r.dia_semana_id !== Number(diaFiltro)) return false;

      if (categoriaFiltro && r.categoria_id !== categoriaFiltro) return false;

      if (temperamentoFiltro && r.ingredientes) {
        const tiene = r.ingredientes.some((ri) => ri.ingrediente?.temperamento === temperamentoFiltro);
        if (!tiene) return false;
      } else if (temperamentoFiltro) {
        return false;
      }

      if (soloSinVenenos && r.ingredientes) {
        const tieneVeneno = r.ingredientes.some((ri) => ri.ingrediente?.es_veneno_hildegardiano);
        if (tieneVeneno) return false;
      }

      if (soloBaseAlegria && r.ingredientes) {
        const tieneBase = r.ingredientes.some((ri) => ri.ingrediente?.es_base_alegria);
        if (!tieneBase) return false;
      } else if (soloBaseAlegria) {
        return false;
      }

      if (vitaminasSel.length > 0 || mineralesSel.length > 0) {
        const pct = r.analisis?.porcentajeVDR;
        if (!pct) return false;
        for (const clave of vitaminasSel) {
          if ((pct[clave] || 0) < UMBRAL_FUENTE) return false;
        }
        for (const clave of mineralesSel) {
          if ((pct[clave] || 0) < UMBRAL_FUENTE) return false;
        }
      }

      return true;
    });
  }, [recetas, textoBusqueda, categoriaFiltro, temperamentoFiltro, soloSinVenenos, soloBaseAlegria, estadoFiltro, precioFiltro, glutenFiltro, igFiltro, diaFiltro, vitaminasSel, mineralesSel]);

  const filtrosActivos = useMemo(() => {
    const filtros: string[] = [];

    if (textoBusqueda.trim()) filtros.push(`Busqueda: ${textoBusqueda.trim()}`);
    if (categoriaFiltro) filtros.push(`Categoria: ${CATEGORIAS[categoriaFiltro]?.nombre || categoriaFiltro}`);

    if (temperamentoFiltro) {
      const temp = TEMPERAMENTOS.find((t) => t.valor === temperamentoFiltro);
      filtros.push(`Temperamento: ${temp?.nombre.replace(/^[^\s]+\s/, '') || temperamentoFiltro}`);
    }

    if (soloSinVenenos) filtros.push('Solo sin venenos');
    if (soloBaseAlegria) filtros.push('Solo base alegria');

    if (estadoFiltro === 'publicados') filtros.push('Estado: Publicados');
    if (estadoFiltro === 'despublicados') filtros.push('Estado: Ocultos');

    if (precioFiltro === 'gratis') filtros.push('Precio: Gratis');
    if (precioFiltro === 'con_precio') filtros.push('Precio: Con precio');

    if (glutenFiltro === 'con') filtros.push('Gluten: Con');
    if (glutenFiltro === 'sin') filtros.push('Gluten: Sin');

    if (igFiltro === 'bajo') filtros.push('IG: Bajo');
    if (igFiltro === 'medio') filtros.push('IG: Medio');
    if (igFiltro === 'alto') filtros.push('IG: Alto');

    const dia = etiquetaDiaFiltro(diaFiltro);
    if (dia) filtros.push(dia);

    if (vitaminasSel.length > 0) filtros.push(`Vitaminas: ${vitaminasSel.length}`);
    if (mineralesSel.length > 0) filtros.push(`Minerales: ${mineralesSel.length}`);

    return filtros;
  }, [textoBusqueda, categoriaFiltro, temperamentoFiltro, soloSinVenenos, soloBaseAlegria, estadoFiltro, precioFiltro, glutenFiltro, igFiltro, diaFiltro, vitaminasSel, mineralesSel]);

  const limpiarFiltros = () => {
    setTextoBusqueda('');
    setCategoriaFiltro(null);
    setTemperamentoFiltro('');
    setSoloSinVenenos(false);
    setSoloBaseAlegria(false);
    setEstadoFiltro('todos');
    setPrecioFiltro('todos');
    setGlutenFiltro('todos');
    setIgFiltro('todos');
    setDiaFiltro('');
    setVitaminasSel([]);
    setMineralesSel([]);
  };

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos || soloBaseAlegria
    || estadoFiltro !== 'todos' || precioFiltro !== 'todos' || glutenFiltro !== 'todos' || igFiltro !== 'todos' || diaFiltro !== ''
    || vitaminasSel.length > 0 || mineralesSel.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">📖 Gestión de Recetas</h1>
            <p className="text-amber-100 text-sm">Administra las recetas hildegardianas</p>
          </div>
          <Link href="/admin" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold">
            ← Volver al Panel
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error al cargar recetas:</strong> {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-gray-600 text-sm font-semibold">RECETAS CREADAS</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{totalRecetas}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
            <h3 className="text-gray-600 text-sm font-semibold">PLATOS SIN RECETA</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{platosSinReceta}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <h3 className="text-gray-600 text-sm font-semibold">COBERTURA</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{cobertura}%</p>
          </div>
        </div>

        <div className="mb-6">
          <Link
            href="/admin/recetas/nueva"
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            ➕ Crear Nueva Receta
          </Link>
        </div>

        {/* Buscador y filtros */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🔍 Buscar y Filtrar</h2>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                placeholder="Buscar por plato o ingrediente..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-semibold"
              >
                ✖️ Limpiar
              </button>
            )}
          </div>

          {/* Fila 1 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📂 Categoría</label>
              <select
                value={categoriaFiltro || ''}
                onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Todas</option>
                {Object.entries(CATEGORIAS).map(([id, cat]) => (
                  <option key={id} value={id}>{cat.icono} {cat.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">🌿 Temperamento</label>
              <select
                value={temperamentoFiltro}
                onChange={(e) => setTemperamentoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Todos</option>
                {TEMPERAMENTOS.map((temp) => (
                  <option key={temp.valor} value={temp.valor}>{temp.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">🚫 Filtro Hildegardiano</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 bg-white">
                <input type="checkbox" checked={soloSinVenenos} onChange={(e) => setSoloSinVenenos(e.target.checked)} className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500" />
                <span className="text-sm text-gray-700">Solo sin venenos</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">✨ Base Alegría</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 bg-white">
                <input type="checkbox" checked={soloBaseAlegria} onChange={(e) => setSoloBaseAlegria(e.target.checked)} className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500" />
                <span className="text-sm text-gray-700">Solo base alegría</span>
              </label>
            </div>
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Día</label>
              <select value={diaFiltro} onChange={(e) => setDiaFiltro(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500">
                <option value="">Todos</option>
                <option value="todos_dias">🗓️ Todos los días</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d.id} value={d.id}>{d.icono} {d.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">👁️ Estado</label>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500">
                <option value="todos">Todos</option>
                <option value="publicados">🟢 Publicados</option>
                <option value="despublicados">⚪ Despublicados</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">💲 Precio</label>
              <select value={precioFiltro} onChange={(e) => setPrecioFiltro(e.target.value as typeof precioFiltro)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500">
                <option value="todos">Todos</option>
                <option value="con_precio">💰 Con precio</option>
                <option value="gratis">🎁 Gratis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">🌾 Gluten</label>
              <select value={glutenFiltro} onChange={(e) => setGlutenFiltro(e.target.value as typeof glutenFiltro)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500">
                <option value="todos">Todos</option>
                <option value="con">Con gluten</option>
                <option value="sin">Sin gluten</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📈 Índice glucémico</label>
              <select value={igFiltro} onChange={(e) => setIgFiltro(e.target.value as typeof igFiltro)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500">
                <option value="todos">Todos</option>
                <option value="bajo">🟢 Bajo (≤ 55)</option>
                <option value="medio">🟡 Medio (56–69)</option>
                <option value="alto">🔴 Alto (≥ 70)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">🧪 Nutrientes</label>
              <button
                type="button"
                onClick={() => setPanelNutrientes((v) => !v)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-between"
              >
                <span>{vitaminasSel.length + mineralesSel.length > 0 ? `${vitaminasSel.length + mineralesSel.length} seleccionados` : 'Vitaminas y minerales'}</span>
                <span>{panelNutrientes ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>

          {panelNutrientes && (
            <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-3">
                Mostrar recetas que sean <strong>buena fuente</strong> (aportan ≥ {UMBRAL_FUENTE}% del valor diario por porción) de:
              </p>
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">💊 Vitaminas</p>
                <div className="flex flex-wrap gap-1.5">
                  {VITAMINAS.map((v) => {
                    const activo = vitaminasSel.includes(v.clave);
                    return (
                      <button key={v.clave} type="button" onClick={() => toggleEnLista(v.clave, vitaminasSel, setVitaminasSel)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${activo ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-amber-400'}`}>
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">⛏️ Minerales</p>
                <div className="flex flex-wrap gap-1.5">
                  {MINERALES.map((m) => {
                    const activo = mineralesSel.includes(m.clave);
                    return (
                      <button key={m.clave} type="button" onClick={() => toggleEnLista(m.clave, mineralesSel, setMineralesSel)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${activo ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400'}`}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {(vitaminasSel.length > 0 || mineralesSel.length > 0) && (
                <button type="button" onClick={() => { setVitaminasSel([]); setMineralesSel([]); }} className="mt-3 text-xs font-semibold text-amber-700 hover:underline">
                  ✖️ Limpiar nutrientes
                </button>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm">
            <p className="text-gray-600">
              Mostrando <strong className="text-amber-700">{recetasFiltradas.length}</strong> de <strong>{recetas.length}</strong> recetas
            </p>
            {recetasFiltradas.length === 0 && (
              <p className="text-orange-600 font-semibold">⚠️ No hay recetas con estos filtros</p>
            )}
          </div>

          {hayFiltros && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <span className="text-sm font-semibold text-amber-800">Filtros activos:</span>
              {filtrosActivos.map((filtro) => (
                <span key={filtro} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                  {filtro}
                </span>
              ))}
              <button
                type="button"
                onClick={limpiarFiltros}
                className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Lista de Recetas */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Recetas ({recetasFiltradas.length})</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {recetasFiltradas.map((r) => {
              const tempDom = temperamentoDominante(r);
              const tempInfo = TEMPERAMENTOS.find((t) => t.valor === tempDom);
              const tieneVeneno = r.ingredientes?.some((ri) => ri.ingrediente?.es_veneno_hildegardiano) || false;
              const tieneBaseAlegria = r.ingredientes?.some((ri) => ri.ingrediente?.es_base_alegria) || false;
              const igCat = categoriaIG(r.indiceGlucemico);
              const categoria = CATEGORIAS[r.categoria_id];

              return (
                <div key={r.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{r.nombrePlato}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                        <span>{categoria?.icono} {categoria?.nombre || 'Sin categoría'}</span>
                        <span>⏱️ {r.tiempo_min} min</span>
                        <span>👥 {r.porciones} porciones</span>
                        <span>📊 {r.dificultad}</span>
                        <span>🥕 {r.numIngredientes} ingredientes</span>
                        <span>👨‍🍳 {r.numPasos} pasos</span>
                        <span>💲 {formatoPrecio(r.precio)}</span>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">📅 {nombreDia(r.dia_semana_id)}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${r.disponible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {r.disponible ? '🟢 Publicado' : '⚪ Oculto'}
                        </span>
                        {igCat && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${IG_INFO[igCat].color}`}>📈 {IG_INFO[igCat].label} ({r.indiceGlucemico})</span>
                        )}
                        {tempInfo && <span className={`px-2 py-1 rounded text-xs font-semibold ${tempInfo.color}`}>{tempInfo.nombre}</span>}
                        {tieneVeneno && <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">🚫 Veneno</span>}
                        {tieneBaseAlegria && <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">✨ Alegría</span>}
                        {r.analisis?.bajaConfianza && <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700">⚠️ Aproximado</span>}
                      </div>

                      {r.notas && (
                        <p className="text-sm text-amber-700 mt-2 italic line-clamp-2">
                          ✨ &quot;{r.notas.substring(0, 150)}...&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={`/admin/recetas/${r.id}`} className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-semibold text-sm">
                        ✏️ Editar
                      </Link>
                      <DeleteButton recetaId={r.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {recetasFiltradas.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg mb-4">😕 No hay recetas con estos filtros</p>
              {hayFiltros ? (
                <button onClick={limpiarFiltros} className="inline-block bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600">
                  Limpiar filtros
                </button>
              ) : (
                <Link href="/admin/recetas/nueva" className="inline-block bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600">
                  Crear la primera receta
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

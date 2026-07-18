'use client';

import { useState, useRef, useEffect } from 'react';

interface PlatoAgg {
  platoId: string;
  nombre: string;
  precio: number;
  platos: number;
  subtotal: number;
  porcionesBase: number;
  pasos: string[];
  ingredientes: { nombre: string; cantidad: number; unidad: string }[];
}

interface IngredienteAgg {
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria?: string | null;
}

interface DiaResumen {
  fecha: string;
  platosAgg: PlatoAgg[];
  totalDia: number;
  ingredientes: IngredienteAgg[];
  totalPlatosDia: number;
  conReceta: boolean;
}

function fmtCant(n: number): string {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1);
}

function fmtFecha(fecha: string): string {
  // Parseo estable de 'YYYY-MM-DD' como fecha local (evita desfase por zona horaria server/cliente)
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Conversión de unidades de receta a una base real: g (masa), ml (volumen) o u (unidades).
// Lo que no está acá es cualitativo (pizca, moderada, a gusto, cantidad necesaria, etc.).
const CONV: Record<string, ['g' | 'ml' | 'u', number]> = {
  kg: ['g', 1000], kilogramos: ['g', 1000], gramos: ['g', 1], g: ['g', 1], gr: ['g', 1],
  litros: ['ml', 1000], litro: ['ml', 1000], l: ['ml', 1000], ml: ['ml', 1], mililitros: ['ml', 1],
  taza: ['ml', 240], tazas: ['ml', 240], vaso: ['ml', 200], vasos: ['ml', 200],
  cucharada: ['ml', 15], cucharadas: ['ml', 15], cucharadita: ['ml', 5], cucharaditas: ['ml', 5],
  unidad: ['u', 1], unidades: ['u', 1], diente: ['u', 1], dientes: ['u', 1],
  bollo: ['u', 1], bollos: ['u', 1], rodaja: ['u', 1], rodajas: ['u', 1], racimo: ['u', 1],
  feta: ['u', 1], fetas: ['u', 1], grande: ['u', 1], grandes: ['u', 1],
  mediana: ['u', 1], medianas: ['u', 1], mediano: ['u', 1], medianos: ['u', 1],
  pequeño: ['u', 1], pequeña: ['u', 1], pequeños: ['u', 1], pequeñas: ['u', 1], chico: ['u', 1], chica: ['u', 1],
};

// Normaliza el nombre para agrupar variantes (tamaños, plural, estado, paréntesis…).
function deburr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const PALABRAS_QUITAR = new Set([
  'grande', 'grandes', 'mediana', 'medianas', 'mediano', 'medianos',
  'pequeno', 'pequena', 'pequenos', 'pequenas', 'chico', 'chica', 'chicos', 'chicas',
  'fresco', 'fresca', 'frescos', 'frescas', 'cocido', 'cocida', 'cocidos', 'cocidas',
  'picado', 'picada', 'picados', 'picadas', 'rallado', 'rallada', 'molido', 'molida',
  'tostado', 'tostada', 'tostados', 'tostadas', 'remojado', 'remojada', 'remojados', 'remojadas',
  'asado', 'asada', 'asados', 'asadas', 'pelado', 'pelada', 'pelados', 'peladas',
  'entera', 'entero', 'enteras', 'enteros', 'seco', 'seca', 'secos', 'secas',
  'duro', 'dura', 'duros', 'duras', 'semiduro', 'semidura', 'tierno', 'tierna',
  'magra', 'magro', 'blanca', 'blanco', 'blancas', 'blancos', 'tinto', 'tinta',
  'integral', 'dulce', 'dulces', 'lavada', 'lavadas', 'limpia', 'generosa',
]);

function normalizarNombre(n: string): string {
  let s = deburr((n || '').toLowerCase());
  s = s.replace(/\(.*?\)/g, ' ');           // quita paréntesis
  s = s.replace(/\ben polvo\b/g, ' ');
  s = s.replace(/\bdel dia anterior\b/g, ' ');
  s = s.replace(/\bpara .*$/g, ' ');        // "para masa", "para servir", etc.
  s = s.replace(/[^a-z0-9\s]/g, ' ');       // limpia comas/símbolos
  let palabras = s.split(/\s+/).filter(Boolean).filter((w) => !PALABRAS_QUITAR.has(w));
  palabras = palabras.map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)); // singular
  return palabras.join(' ').trim();
}

interface Consolidado {
  key: string;
  nombre: string;
  categoria: string;
  g: number;
  ml: number;
  u: number;
  qual: boolean;
}

// Categorías de ingredientes: título + ícono + orden en la lista de compras.
const CATEGORIAS: Array<{ id: string; nombre: string; icono: string }> = [
  { id: 'carnes', nombre: 'Carnes', icono: '🥩' },
  { id: 'pescados', nombre: 'Pescados y mariscos', icono: '🐟' },
  { id: 'verduras', nombre: 'Verduras', icono: '🥕' },
  { id: 'frutas', nombre: 'Frutas', icono: '🍎' },
  { id: 'legumbres', nombre: 'Legumbres', icono: '🫘' },
  { id: 'granos', nombre: 'Granos y cereales', icono: '🌾' },
  { id: 'lacteos', nombre: 'Lácteos', icono: '🧀' },
  { id: 'frutos_secos', nombre: 'Frutos secos', icono: '🥜' },
  { id: 'aceites', nombre: 'Aceites', icono: '🫒' },
  { id: 'condimentos', nombre: 'Condimentos', icono: '🧂' },
  { id: 'especias', nombre: 'Especias', icono: '🌶️' },
  { id: 'hierbas', nombre: 'Hierbas', icono: '🌿' },
  { id: 'endulzantes', nombre: 'Endulzantes', icono: '🍯' },
  { id: 'bebidas', nombre: 'Bebidas', icono: '🥤' },
  { id: 'otros', nombre: 'Otros', icono: '📦' },
];

function montoTexto(item: Consolidado): string {
  const partes: string[] = [];
  if (item.g > 0) partes.push(item.g >= 1000 ? `${(item.g / 1000).toFixed(item.g % 1000 === 0 ? 0 : 1)} kg` : `${Math.round(item.g)} g`);
  if (item.ml > 0) partes.push(item.ml >= 1000 ? `${(item.ml / 1000).toFixed(1)} L` : `${Math.round(item.ml)} ml`);
  if (item.u > 0) partes.push(`${item.u % 1 === 0 ? item.u : item.u.toFixed(1)} u`);
  if (item.qual) partes.push('a gusto');
  return partes.length ? partes.join(' + ') : 'a gusto';
}

export default function ProduccionPorDia({ dias }: { dias: DiaResumen[] }) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => new Set(dias.map((d) => d.fecha)));
  const [filtro, setFiltro] = useState('');
  const [comprados, setComprados] = useState<Set<string>>(new Set());
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set()); // días desplegados (vacío = minimizado)
  const [recetaModal, setRecetaModal] = useState<PlatoAgg | null>(null);
  const [porcionesModal, setPorcionesModal] = useState(1);

  const abrirReceta = (p: PlatoAgg) => {
    setRecetaModal(p);
    setPorcionesModal(Math.max(1, p.platos || 1));
  };

  const setAbierto = (fecha: string, open: boolean) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (open) next.add(fecha);
      else next.delete(fecha);
      return next;
    });
  const expandirTodo = () => setAbiertos(new Set(dias.map((d) => d.fecha)));
  const colapsarTodo = () => setAbiertos(new Set());

  const todosSeleccionados = dias.length > 0 && seleccionados.size === dias.length;
  const algunoSeleccionado = seleccionados.size > 0 && !todosSeleccionados;
  const toggleTodosDias = () =>
    setSeleccionados(todosSeleccionados ? new Set() : new Set(dias.map((d) => d.fecha)));
  const masterRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = algunoSeleccionado;
  }, [algunoSeleccionado]);

  const toggleComprado = (k: string) =>
    setComprados((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const toggleDia = (fecha: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(fecha)) next.delete(fecha);
      else next.add(fecha);
      return next;
    });
  };

  const diasSel = dias.filter((d) => seleccionados.has(d.fecha));
  const totalPrecio = diasSel.reduce((s, d) => s + d.totalDia, 0);
  const totalPlatos = diasSel.reduce((s, d) => s + d.totalPlatosDia, 0);

  // Lista de compras consolidada: una línea por ingrediente, normalizando unidades.
  const totalsMap = new Map<string, Consolidado>();
  diasSel.forEach((d) => {
    d.ingredientes.forEach((ing) => {
      const key = normalizarNombre(ing.nombre);
      const cur = totalsMap.get(key) || { key, nombre: ing.nombre, categoria: ing.categoria || 'otros', g: 0, ml: 0, u: 0, qual: false };
      if (ing.nombre.length < cur.nombre.length) cur.nombre = ing.nombre;
      if ((!cur.categoria || cur.categoria === 'otros') && ing.categoria) cur.categoria = ing.categoria;
      const conv = CONV[(ing.unidad || '').toLowerCase().trim()];
      if (conv) cur[conv[0]] += ing.cantidad * conv[1];
      else cur.qual = true;
      totalsMap.set(key, cur);
    });
  });
  const compras = Array.from(totalsMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const comprasFiltradas = filtro.trim()
    ? compras.filter((c) => c.nombre.toLowerCase().includes(filtro.trim().toLowerCase()))
    : compras;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer" title={todosSeleccionados ? 'Deseleccionar todos los días' : 'Seleccionar todos los días'}>
          <input
            ref={masterRef}
            type="checkbox"
            checked={todosSeleccionados}
            onChange={toggleTodosDias}
            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🍽️ Producción por día</h2>
        </label>
        {dias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={expandirTodo}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            >
              🔽 Expandir todo
            </button>
            <button
              onClick={colapsarTodo}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              🔼 Colapsar todo
            </button>
          </div>
        )}
      </div>

      {dias.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No hay platos seleccionados aún</p>
      ) : (
        <div className="flex flex-col">
          {/* Resumen consolidado de compras (días seleccionados) — al final */}
          <div className="order-2 mt-6 border-2 border-emerald-200 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200">
                🛒 Lista de compras — {diasSel.length} día{diasSel.length !== 1 ? 's' : ''} seleccionado{diasSel.length !== 1 ? 's' : ''}
              </h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold px-3 py-1 rounded-full">
                  🍽️ {totalPlatos} plato{totalPlatos !== 1 ? 's' : ''}
                </span>
                <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 font-bold px-3 py-1 rounded-full">
                  💰 Total: ${totalPrecio.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
            <div className="p-4">
              {diasSel.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Seleccioná al menos un día para ver la lista de compras.</p>
              ) : compras.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Los platos de los días seleccionados no tienen ingredientes cargados.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <input
                      type="text"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      placeholder="Buscar ingrediente…"
                      className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{comprasFiltradas.length} ingredientes</span>
                  </div>
                  {(() => {
                    const idsConocidos = new Set(CATEGORIAS.filter((c) => c.id !== 'otros').map((c) => c.id));
                    return (
                      <div className="space-y-4">
                        {CATEGORIAS.map((cat) => {
                          const items = comprasFiltradas.filter((c) =>
                            cat.id === 'otros' ? !idsConocidos.has(c.categoria) : c.categoria === cat.id
                          );
                          if (items.length === 0) return null;
                          return (
                            <div key={cat.id}>
                              <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                                <span className="text-lg">{cat.icono}</span>
                                <span>{cat.nombre} a comprar</span>
                                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({items.length})</span>
                              </h4>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {items.map((ing) => {
                                  const comprado = comprados.has(ing.key);
                                  return (
                                    <li
                                      key={ing.key}
                                      className={`flex justify-between items-center gap-2 text-sm rounded px-3 py-2 ${comprado ? 'bg-gray-100 dark:bg-gray-700' : 'bg-green-50 dark:bg-green-950/30'}`}
                                    >
                                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={comprado}
                                          onChange={() => toggleComprado(ing.key)}
                                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <span className={`capitalize truncate ${comprado ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'}`}>{ing.nombre}</span>
                                      </label>
                                      <span className={`font-bold whitespace-nowrap ${comprado ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-green-700 dark:text-green-300'}`}>{montoTexto(ing)}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                    Las cantidades se suman convirtiendo a g / ml / unidades. “a gusto” = ingredientes con medida no exacta (pizca, sal, condimentos, etc.).
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Días (colapsables + seleccionables) */}
          <div className="space-y-2">
            {dias.map((dia) => {
              const activo = seleccionados.has(dia.fecha);
              return (
                <details
                  key={dia.fecha}
                  open={abiertos.has(dia.fecha)}
                  onToggle={(e) => setAbierto(dia.fecha, (e.target as HTMLDetailsElement).open)}
                  className={`group border rounded-xl overflow-hidden ${activo ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-200 dark:border-gray-700 opacity-70'}`}
                >
                  <summary className="bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5 text-sm min-w-0">
                      <input
                        type="checkbox"
                        checked={activo}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleDia(dia.fecha)}
                        className="w-4 h-4 shrink-0 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        title={activo ? 'Quitar de la lista de compras' : 'Incluir en la lista de compras'}
                      />
                      <span className="text-indigo-500 transition-transform group-open:rotate-90 shrink-0">▶</span>
                      <span className="capitalize truncate">📅 {fmtFecha(dia.fecha)}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold px-2 py-0.5 rounded-full">
                        🍽️ {dia.totalPlatosDia}
                      </span>
                      <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 font-bold px-2 py-0.5 rounded-full">
                        💰 ${dia.totalDia.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </summary>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">👨‍🍳 Platos a preparar</h4>
                      <ul className="space-y-2">
                        {dia.platosAgg.map((p, i) => {
                          const tieneReceta = p.ingredientes.length > 0 || p.pasos.length > 0;
                          return (
                            <li key={i}>
                              <button
                                type="button"
                                onClick={() => tieneReceta && abrirReceta(p)}
                                className={`w-full flex justify-between items-center gap-2 rounded-lg px-3 py-2 text-left ${tieneReceta ? 'bg-gray-50 dark:bg-gray-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer' : 'bg-gray-50 dark:bg-gray-900 cursor-default'}`}
                              >
                                <span className="text-gray-800 dark:text-gray-100">
                                  <span className="font-bold text-indigo-700 dark:text-indigo-300">{p.platos}×</span> {p.nombre}
                                  {tieneReceta && <span className="ml-2 text-xs text-indigo-500 dark:text-indigo-300 whitespace-nowrap">📖 ver receta</span>}
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                  {p.precio > 0 ? `$${p.precio.toLocaleString('es-AR')} c/u = ` : 'Gratis · '}
                                  <strong>${p.subtotal.toLocaleString('es-AR')}</strong>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">🛒 Ingredientes necesarios</h4>
                      {dia.ingredientes.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {dia.conReceta ? 'Sin ingredientes cargados en las recetas.' : 'Los platos de este día no tienen receta cargada.'}
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {dia.ingredientes.map((ing, i) => (
                            <li key={i} className="flex justify-between text-sm bg-green-50 dark:bg-green-950/30 rounded px-3 py-1.5">
                              <span className="text-gray-800 dark:text-gray-100">{ing.nombre}</span>
                              <span className="font-semibold text-green-700 dark:text-green-300">{fmtCant(ing.cantidad)} {ing.unidad}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {recetaModal && (() => {
        const factor = porcionesModal / (recetaModal.porcionesBase || 1);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRecetaModal(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-indigo-700 to-blue-600 text-white px-5 py-4 flex justify-between items-start gap-3 z-10">
                <div>
                  <h3 className="text-lg font-bold">{recetaModal.nombre}</h3>
                  <p className="text-indigo-100 text-xs">Receta original para {recetaModal.porcionesBase} porción{recetaModal.porcionesBase !== 1 ? 'es' : ''}</p>
                </div>
                <button onClick={() => setRecetaModal(null)} className="text-white hover:text-indigo-200 text-2xl leading-none">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 rounded-lg px-4 py-3">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">👥 Para</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPorcionesModal((p) => Math.max(1, p - 1))} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border font-bold text-indigo-700 text-lg">−</button>
                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 w-10 text-center">{porcionesModal}</span>
                    <button onClick={() => setPorcionesModal((p) => p + 1)} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border font-bold text-indigo-700 text-lg">+</button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">porción{porcionesModal !== 1 ? 'es' : ''}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2">🥕 Ingredientes (para {porcionesModal})</h4>
                  {recetaModal.ingredientes.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Esta receta no tiene ingredientes cargados.</p>
                  ) : (
                    <ul className="space-y-1">
                      {recetaModal.ingredientes.map((ing, i) => (
                        <li key={i} className="flex justify-between text-sm bg-green-50 dark:bg-green-950/30 rounded px-3 py-1.5">
                          <span className="text-gray-800 dark:text-gray-100">{ing.nombre}</span>
                          <span className="font-semibold text-green-700 dark:text-green-300">{fmtCant(ing.cantidad * factor)} {ing.unidad}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {recetaModal.pasos.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2">👨‍🍳 Preparación</h4>
                    <ol className="space-y-2">
                      {recetaModal.pasos.map((paso, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                          <span className="text-gray-700 dark:text-gray-200 pt-0.5">{paso}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t px-5 py-3">
                <button onClick={() => setRecetaModal(null)} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700">← Volver al pedido</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

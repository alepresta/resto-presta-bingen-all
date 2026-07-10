'use client';

import { useState } from 'react';

interface PlatoAgg {
  nombre: string;
  precio: number;
  platos: number;
  subtotal: number;
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
  return new Date(fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
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

  const seleccionarTodos = () => setSeleccionados(new Set(dias.map((d) => d.fecha)));
  const deseleccionarTodos = () => setSeleccionados(new Set());

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

  const todosSeleccionados = seleccionados.size === dias.length && dias.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-800">🍽️ Producción por día</h2>
        {dias.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={seleccionarTodos}
              disabled={todosSeleccionados}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
            >
              ✅ Seleccionar todos
            </button>
            <button
              onClick={deseleccionarTodos}
              disabled={seleccionados.size === 0}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              ✖️ Deseleccionar todos
            </button>
          </div>
        )}
      </div>

      {dias.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay platos seleccionados aún</p>
      ) : (
        <>
          {/* Resumen consolidado de compras (días seleccionados) */}
          <div className="mb-6 border-2 border-emerald-200 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 px-4 py-3 flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-bold text-emerald-800">
                🛒 Lista de compras — {diasSel.length} día{diasSel.length !== 1 ? 's' : ''} seleccionado{diasSel.length !== 1 ? 's' : ''}
              </h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="bg-amber-100 text-amber-800 font-semibold px-3 py-1 rounded-full">
                  🍽️ {totalPlatos} plato{totalPlatos !== 1 ? 's' : ''}
                </span>
                <span className="bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full">
                  💰 Total: ${totalPrecio.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
            <div className="p-4">
              {diasSel.length === 0 ? (
                <p className="text-sm text-gray-500">Seleccioná al menos un día para ver la lista de compras.</p>
              ) : compras.length === 0 ? (
                <p className="text-sm text-gray-500">Los platos de los días seleccionados no tienen ingredientes cargados.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <input
                      type="text"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      placeholder="Buscar ingrediente…"
                      className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-500">{comprasFiltradas.length} ingredientes</span>
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
                              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2 border-b border-gray-200 pb-1">
                                <span className="text-lg">{cat.icono}</span>
                                <span>{cat.nombre} a comprar</span>
                                <span className="text-xs font-normal text-gray-400">({items.length})</span>
                              </h4>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {items.map((ing) => {
                                  const comprado = comprados.has(ing.key);
                                  return (
                                    <li
                                      key={ing.key}
                                      className={`flex justify-between items-center gap-2 text-sm rounded px-3 py-2 ${comprado ? 'bg-gray-100' : 'bg-green-50'}`}
                                    >
                                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={comprado}
                                          onChange={() => toggleComprado(ing.key)}
                                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <span className={`capitalize truncate ${comprado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{ing.nombre}</span>
                                      </label>
                                      <span className={`font-bold whitespace-nowrap ${comprado ? 'text-gray-400 line-through' : 'text-green-700'}`}>{montoTexto(ing)}</span>
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
                  <p className="text-[11px] text-gray-400 mt-2">
                    Las cantidades se suman convirtiendo a g / ml / unidades. “a gusto” = ingredientes con medida no exacta (pizca, sal, condimentos, etc.).
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Días (colapsables + seleccionables) */}
          <div className="space-y-3">
            {dias.map((dia) => {
              const activo = seleccionados.has(dia.fecha);
              return (
                <details key={dia.fecha} className={`group border rounded-xl overflow-hidden ${activo ? 'border-indigo-300' : 'border-gray-200 opacity-70'}`}>
                  <summary className="bg-indigo-50 px-4 py-3 flex flex-wrap justify-between items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-indigo-100">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activo}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleDia(dia.fecha)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        title={activo ? 'Quitar de la lista de compras' : 'Incluir en la lista de compras'}
                      />
                      <span className="text-indigo-500 transition-transform group-open:rotate-90">▶</span>
                      📅 {fmtFecha(dia.fecha)}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="bg-amber-100 text-amber-800 font-semibold px-3 py-1 rounded-full">
                        🍽️ {dia.totalPlatosDia} plato{dia.totalPlatosDia !== 1 ? 's' : ''} a preparar
                      </span>
                      <span className="bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full">
                        💰 Total día: ${dia.totalDia.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </summary>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">👨‍🍳 Platos a preparar</h4>
                      <ul className="space-y-2">
                        {dia.platosAgg.map((p, i) => (
                          <li key={i} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-gray-800">
                              <span className="font-bold text-indigo-700">{p.platos}×</span> {p.nombre}
                            </span>
                            <span className="text-sm text-gray-600">
                              {p.precio > 0 ? `$${p.precio.toLocaleString('es-AR')} c/u = ` : 'Gratis · '}
                              <strong>${p.subtotal.toLocaleString('es-AR')}</strong>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">🛒 Ingredientes necesarios</h4>
                      {dia.ingredientes.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          {dia.conReceta ? 'Sin ingredientes cargados en las recetas.' : 'Los platos de este día no tienen receta cargada.'}
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {dia.ingredientes.map((ing, i) => (
                            <li key={i} className="flex justify-between text-sm bg-green-50 rounded px-3 py-1.5">
                              <span className="text-gray-800">{ing.nombre}</span>
                              <span className="font-semibold text-green-700">{fmtCant(ing.cantidad)} {ing.unidad}</span>
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
        </>
      )}
    </div>
  );
}

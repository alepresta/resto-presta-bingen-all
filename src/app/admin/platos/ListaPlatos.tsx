'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ToggleTema from '@/components/ToggleTema';

interface Ingrediente {
  id: string;
  nombre: string;
  temperamento: string | null;
  es_veneno_hildegardiano: boolean;
  es_base_alegria: boolean;
}

interface Plato {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria_id: number;
  disponible: boolean;
  imagen: string | null;
  receta?: {
    id: string;
    ingredientes?: Array<{
      ingrediente: Ingrediente;
    }>;
  } | null;
}

interface ListaPlatosProps {
  platos: Plato[];
}

const CATEGORIAS: Record<number, { nombre: string; icono: string }> = {
  1: { nombre: 'Desayuno', icono: '☕' },
  2: { nombre: 'Plato Principal', icono: '🍽️' },
  3: { nombre: 'Guarnición', icono: '🥗' },
  4: { nombre: 'Bebida', icono: '🥤' },
  5: { nombre: 'Postre', icono: '🍰' },
};

const TEMPERAMENTOS = [
  { valor: 'calido', nombre: '🌡️ Cálido', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  { valor: 'calido_seco', nombre: '🔥 Cálido-Seco', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { valor: 'calido_humedo', nombre: '🌊 Cálido-Húmedo', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { valor: 'frio', nombre: '❄️ Frío', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { valor: 'frio_seco', nombre: '🍃 Frío-Seco', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  { valor: 'frio_humedo', nombre: '💧 Frío-Húmedo', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
];

export default function ListaPlatos({ platos }: ListaPlatosProps) {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [temperamentoFiltro, setTemperamentoFiltro] = useState<string>('');
  const [soloSinVenenos, setSoloSinVenenos] = useState(false);
  const [soloBaseAlegria, setSoloBaseAlegria] = useState(false);
  const [vista, setVista] = useState<'grid' | 'lista'>('grid');

  const platosFiltrados = useMemo(() => {
    return platos.filter((plato) => {
      if (textoBusqueda) {
        const texto = textoBusqueda.toLowerCase();
        const coincideNombre = plato.nombre.toLowerCase().includes(texto);
        const coincideDesc = plato.descripcion?.toLowerCase().includes(texto) || false;
        const coincideIngrediente = plato.receta?.ingredientes?.some(ri =>
          ri.ingrediente.nombre.toLowerCase().includes(texto)
        ) || false;
        if (!coincideNombre && !coincideDesc && !coincideIngrediente) return false;
      }

      if (categoriaFiltro && plato.categoria_id !== categoriaFiltro) return false;

      if (temperamentoFiltro && plato.receta?.ingredientes) {
        const tieneTemperamento = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.temperamento === temperamentoFiltro
        );
        if (!tieneTemperamento) return false;
      } else if (temperamentoFiltro) {
        return false;
      }

      if (soloSinVenenos && plato.receta?.ingredientes) {
        const tieneVeneno = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.es_veneno_hildegardiano
        );
        if (tieneVeneno) return false;
      }

      if (soloBaseAlegria && plato.receta?.ingredientes) {
        const tieneBase = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.es_base_alegria
        );
        if (!tieneBase) return false;
      } else if (soloBaseAlegria) {
        return false;
      }

      return true;
    });
  }, [platos, textoBusqueda, categoriaFiltro, temperamentoFiltro, soloSinVenenos, soloBaseAlegria]);

  const totalConReceta = platos.filter(p => p.receta?.id).length;
  const totalConVenenos = platos.filter(p => 
    p.receta?.ingredientes?.some(ri => ri.ingrediente.es_veneno_hildegardiano)
  ).length;
  const totalBaseAlegria = platos.filter(p => 
    p.receta?.ingredientes?.some(ri => ri.ingrediente.es_base_alegria)
  ).length;

  const limpiarFiltros = () => {
    setTextoBusqueda('');
    setCategoriaFiltro(null);
    setTemperamentoFiltro('');
    setSoloSinVenenos(false);
    setSoloBaseAlegria(false);
  };

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos || soloBaseAlegria;

  const getTemperamentoDominante = (plato: Plato): string | null => {
    if (!plato.receta?.ingredientes) return null;
    const temps: Record<string, number> = {};
    plato.receta.ingredientes.forEach(ri => {
      const t = ri.ingrediente.temperamento;
      if (t) temps[t] = (temps[t] || 0) + 1;
    });
    const entries = Object.entries(temps);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🍽️ Gestión de Platos</h1>
            <p className="text-amber-100 text-sm">
              {platos.length} platos · {totalConReceta} con receta · {totalConVenenos} con venenos · {totalBaseAlegria} base alegría
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <ToggleTema />
            <Link
              href="/admin"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              ← Panel
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Buscador */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🔍 Buscar y Filtrar</h2>
          
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                placeholder="🔍 Buscar por nombre, descripción o ingrediente..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold"
              >
                ✖️ Limpiar
              </button>
            )}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setVista('grid')}
                className={`px-3 py-2 rounded ${vista === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''} text-gray-700 dark:text-gray-200`}
                title="Vista cuadrícula"
              >
                ▦
              </button>
              <button
                onClick={() => setVista('lista')}
                className={`px-3 py-2 rounded ${vista === 'lista' ? 'bg-white dark:bg-gray-600 shadow' : ''} text-gray-700 dark:text-gray-200`}
                title="Vista lista"
              >
                ☰
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📂 Categoría</label>
              <select
                value={categoriaFiltro || ''}
                onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todas</option>
                {Object.entries(CATEGORIAS).map(([id, cat]) => (
                  <option key={id} value={id}>
                    {cat.icono} {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🌿 Temperamento</label>
              <select
                value={temperamentoFiltro}
                onChange={(e) => setTemperamentoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todos</option>
                {TEMPERAMENTOS.map((temp) => (
                  <option key={temp.valor} value={temp.valor}>
                    {temp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🚫 Filtro Hildegardiano</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700">
                <input
                  type="checkbox"
                  checked={soloSinVenenos}
                  onChange={(e) => setSoloSinVenenos(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Solo sin venenos</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">✨ Base Alegría</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700">
                <input
                  type="checkbox"
                  checked={soloBaseAlegria}
                  onChange={(e) => setSoloBaseAlegria(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Solo base alegría</span>
              </label>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Mostrando <strong className="text-amber-700 dark:text-amber-400">{platosFiltrados.length}</strong> de <strong>{platos.length}</strong> platos
            </p>
            {platosFiltrados.length === 0 && (
              <p className="text-orange-600 dark:text-orange-400 font-semibold">⚠️ No hay platos con estos filtros</p>
            )}
          </div>
        </div>

        {/* Grid de platos */}
        {vista === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platosFiltrados.map((plato) => {
              const tempDominante = getTemperamentoDominante(plato);
              const tempInfo = TEMPERAMENTOS.find(t => t.valor === tempDominante);
              const tieneVeneno = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_veneno_hildegardiano) || false;
              const tieneBaseAlegria = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_base_alegria) || false;
              const numIngredientes = plato.receta?.ingredientes?.length || 0;
              const categoria = CATEGORIAS[plato.categoria_id];

              return (
                <div
                  key={plato.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 overflow-hidden ${
                    tieneVeneno ? 'border-red-500' : tieneBaseAlegria ? 'border-green-500' : 'border-amber-500'
                  }`}
                >
                  {plato.imagen && (
                    <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <img
                        src={plato.imagen}
                        alt={plato.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🍽️ Sin imagen%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-amber-700 dark:text-amber-400">
                        ${plato.precio.toLocaleString('es-AR')}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight">
                          {plato.nombre}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {categoria?.icono} {categoria?.nombre || 'Sin categoría'}
                        </p>
                      </div>
                    </div>

                    {plato.descripcion && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{plato.descripcion}</p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-3">
                      {tempInfo && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${tempInfo.color}`}>
                          {tempInfo.nombre}
                        </span>
                      )}
                      {tieneVeneno && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          🚫 Veneno
                        </span>
                      )}
                      {tieneBaseAlegria && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          ✨ Alegría
                        </span>
                      )}
                      {numIngredientes > 0 && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          🥕 {numIngredientes} ing.
                        </span>
                      )}
                      {!plato.receta?.id && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                          ⚠️ Sin receta
                        </span>
                      )}
                    </div>

                    {plato.receta?.ingredientes && plato.receta.ingredientes.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                        <p className="font-semibold mb-1">Ingredientes:</p>
                        <p className="line-clamp-2">
                          {plato.receta.ingredientes.slice(0, 5).map(ri => ri.ingrediente.nombre).join(', ')}
                          {plato.receta.ingredientes.length > 5 && ` +${plato.receta.ingredientes.length - 5} más`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Plato</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Categoría</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Precio</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Temperamento</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {platosFiltrados.map((plato) => {
                  const tempDominante = getTemperamentoDominante(plato);
                  const tempInfo = TEMPERAMENTOS.find(t => t.valor === tempDominante);
                  const tieneVeneno = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_veneno_hildegardiano) || false;
                  const tieneBaseAlegria = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_base_alegria) || false;
                  const categoria = CATEGORIAS[plato.categoria_id];

                  return (
                    <tr key={plato.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {plato.imagen && (
                            <img
                              src={plato.imagen}
                              alt={plato.nombre}
                              className="w-12 h-12 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{plato.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{plato.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {categoria?.icono} {categoria?.nombre}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                        ${plato.precio.toLocaleString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tempInfo ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${tempInfo.color}`}>
                            {tempInfo.nombre}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {tieneVeneno && <span title="Contiene venenos">🚫</span>}
                          {tieneBaseAlegria && <span title="Base de alegría">✨</span>}
                          {!plato.receta?.id && <span title="Sin receta">⚠️</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {platosFiltrados.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center transition-colors">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">😕 No hay platos con estos filtros</p>
            <button
              onClick={limpiarFiltros}
              className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 font-semibold"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

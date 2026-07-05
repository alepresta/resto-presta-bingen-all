'use client';

import { useState } from 'react';

interface Ingrediente {
  nombre: string;
  unidad: string;
  cantidad: number;
}

interface Receta {
  id: string;
  pasos: string[];
  ingredientes: Ingrediente[];
  tiempo_min: number;
  porciones: number;
  dificultad: string;
  notas_hildegardianas: string;
}

interface Plato {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  alergenos: string[];
  tags: string[];
  es_estrella: boolean;
  dia_semana_id: number | null;
  disponible_todos_dias: boolean;
  categoria_id: number;
  receta: Receta | null;
}

interface Categoria {
  id: number;
  nombre: string;
  icono: string;
  platos: Plato[];
}

interface Restaurante {
  id: string;
  nombre: string;
  tagline: string;
}

interface DiaInfo {
  id: number;
  nombre: string;
  tematica: string;
}

interface MenuVisualProps {
  restaurante: Restaurante;
  diaInfo: DiaInfo;
  categorias: Categoria[];
  todosLosPlatos: Plato[];
}

export default function MenuVisual({ restaurante, diaInfo, categorias, todosLosPlatos }: MenuVisualProps) {
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Plato | null>(null);
  const [diaActivo, setDiaActivo] = useState<number>(diaInfo.id);
  const [categoriaActiva, setCategoriaActiva] = useState<number | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'principales' | 'extras'>('principales');

  const dias = [
    { id: 1, nombre: 'Lun', icono: '🥩', tematica: 'Carne' },
    { id: 2, nombre: 'Mar', icono: '🥗', tematica: 'Verdura' },
    { id: 3, nombre: 'Mié', icono: '🍝', tematica: 'Pasta' },
    { id: 4, nombre: 'Jue', icono: '🍗', tematica: 'Pollo' },
    { id: 5, nombre: 'Vie', icono: '🐟', tematica: 'Pescado' },
    { id: 6, nombre: 'Sáb', icono: '🍕', tematica: 'Libre' },
    { id: 7, nombre: 'Dom', icono: '🍝', tematica: 'Pastas' },
  ];

  // Separar categorías: ID 2 = Platos Principales, el resto = Extras
  const categoriaPrincipales = categorias.find(cat => cat.id === 2);
  const categoriasExtras = categorias.filter(cat => cat.id !== 2);

  // Filtrar platos principales por día
  const platosPrincipales = (categoriaPrincipales?.platos || []).filter((plato) => {
    if (plato.dia_semana_id === null) return true;
    if (plato.dia_semana_id === diaActivo) return true;
    return false;
  });

  // Filtrar extras por categoría si está activa
  const extrasFiltrados = categoriaActiva
    ? categoriasExtras.filter((cat) => cat.id === categoriaActiva)
    : categoriasExtras;

  return (
    <>
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-serif">{restaurante.nombre}</h1>
            <p className="text-lg italic text-amber-100 mt-1">"{restaurante.tagline}"</p>
          </div>
        </div>
      </header>

      {/* Navegación Principal: Tabs */}
      <div className="bg-white border-b shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 py-3">
            <button
              onClick={() => {
                setVistaActiva('principales');
                setCategoriaActiva(null);
              }}
              className={`flex-1 md:flex-none px-6 py-3 rounded-lg font-bold text-sm md:text-base transition-all ${
                vistaActiva === 'principales'
                  ? 'bg-amber-500 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🍽️ Platos Principales
            </button>
            <button
              onClick={() => {
                setVistaActiva('extras');
                setCategoriaActiva(null);
              }}
              className={`flex-1 md:flex-none px-6 py-3 rounded-lg font-bold text-sm md:text-base transition-all ${
                vistaActiva === 'extras'
                  ? 'bg-amber-500 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ☕ Extras
            </button>
          </div>
        </div>
      </div>

      {/* VISTA: PLATOS PRINCIPALES */}
      {vistaActiva === 'principales' && (
        <>
          {/* Selector de Días */}
          <div className="bg-amber-50 border-b shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <h2 className="text-sm font-semibold text-gray-600 mb-3 text-center">
                📅 Seleccioná el día de la semana
              </h2>
              <div className="grid grid-cols-7 gap-2">
                {dias.map((dia) => (
                  <button
                    key={dia.id}
                    onClick={() => setDiaActivo(dia.id)}
                    className={`flex flex-col items-center p-2 md:p-3 rounded-lg transition-all ${
                      diaActivo === dia.id
                        ? 'bg-amber-500 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span className="text-xl md:text-2xl mb-1">{dia.icono}</span>
                    <span className="text-xs font-bold">{dia.nombre}</span>
                    <span className="text-xs opacity-75 hidden md:block">{dia.tematica}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contenido: Platos del día */}
          <main className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800">
                🍽️ Platos Principales del {dias.find(d => d.id === diaActivo)?.nombre}
              </h2>
              <p className="text-sm text-amber-700 mt-2 font-semibold">
                {platosPrincipales.length} platos disponibles para hoy
              </p>
            </div>

            {platosPrincipales.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No hay platos disponibles para este día</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platosPrincipales.map((plato) => (
                  <div
                    key={plato.id}
                    onClick={() => plato.receta && setPlatoSeleccionado(plato)}
                    className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden ${
                      plato.receta ? 'cursor-pointer hover:scale-105' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-800">{plato.nombre}</h3>
                            {plato.es_estrella && <span className="text-xl" title="Especialidad">⭐</span>}
                            {plato.receta && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                                📖 Receta
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mt-1">{plato.descripcion}</p>
                        </div>
                        <div className="text-right ml-4">
                          <span className="text-xl font-bold text-amber-600">
                            $ {plato.precio.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {plato.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {plato.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {plato.alergenos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-red-600 font-semibold mb-1">⚠️ Alérgenos:</p>
                          <div className="flex flex-wrap gap-1">
                            {plato.alergenos.map((alergeno) => (
                              <span
                                key={alergeno}
                                className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200"
                              >
                                {alergeno}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {plato.receta && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-amber-700 font-semibold">
                            👆 Click para ver receta completa
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* VISTA: EXTRAS */}
      {vistaActiva === 'extras' && (
        <>
          {/* Selector de Categorías */}
          <div className="bg-amber-50 border-b shadow-sm sticky top-[72px] z-10">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setCategoriaActiva(null)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                    categoriaActiva === null
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  🍽️ Todos
                </button>
                {categoriasExtras.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaActiva(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                      categoriaActiva === cat.id
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {cat.icono} {cat.nombre} ({cat.platos.length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contenido: Extras */}
          <main className="max-w-6xl mx-auto px-4 py-8">
            {extrasFiltrados.map((categoria) => (
              <div key={categoria.id} className="mb-12">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {categoria.icono} {categoria.nombre}
                  </h2>
                  <p className="text-sm text-amber-700 mt-2 font-semibold">
                    {categoria.platos.length} opciones disponibles
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoria.platos.map((plato) => (
                    <div
                      key={plato.id}
                      onClick={() => plato.receta && setPlatoSeleccionado(plato)}
                      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden ${
                        plato.receta ? 'cursor-pointer hover:scale-105' : ''
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-800">{plato.nombre}</h3>
                              {plato.es_estrella && <span className="text-xl" title="Especialidad">⭐</span>}
                              {plato.receta && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                                  📖 Receta
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mt-1">{plato.descripcion}</p>
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-xl font-bold text-amber-600">
                              $ {plato.precio.toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>

                        {plato.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {plato.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {plato.alergenos.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-red-600 font-semibold mb-1">⚠️ Alérgenos:</p>
                            <div className="flex flex-wrap gap-1">
                              {plato.alergenos.map((alergeno) => (
                                <span
                                  key={alergeno}
                                  className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200"
                                >
                                  {alergeno}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {plato.receta && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-amber-700 font-semibold">
                              👆 Click para ver receta completa
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </main>
        </>
      )}

      {/* Modal de Receta */}
      {platoSeleccionado?.receta && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPlatoSeleccionado(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-amber-700 to-orange-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{platoSeleccionado.nombre}</h2>
                  <p className="text-amber-100 mt-1">{platoSeleccionado.descripcion}</p>
                </div>
                <button
                  onClick={() => setPlatoSeleccionado(null)}
                  className="text-white hover:text-amber-200 text-3xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex gap-4 mt-4 text-sm">
                <span>⏱️ {platoSeleccionado.receta.tiempo_min} min</span>
                <span>👥 {platoSeleccionado.receta.porciones} porciones</span>
                <span>📊 {platoSeleccionado.receta.dificultad}</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Ingredientes */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  🥕 Ingredientes
                </h3>
                <ul className="space-y-2">
                  {platoSeleccionado.receta.ingredientes.map((ing, i) => (
                    <li key={i} className="flex justify-between items-center bg-amber-50 p-2 rounded">
                      <span className="font-medium text-gray-700">{ing.nombre}</span>
                      <span className="text-amber-700 font-semibold">
                        {ing.cantidad} {ing.unidad}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pasos */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  👨‍🍳 Preparación
                </h3>
                <ol className="space-y-3">
                  {platoSeleccionado.receta.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <p className="text-gray-700 pt-1">{paso}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Notas Hildegardianas */}
              {platoSeleccionado.receta.notas_hildegardianas && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-amber-600 p-4 rounded">
                  <h3 className="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
                    ✨ Sabiduría de Santa Hildegarda
                  </h3>
                  <p className="text-gray-700 italic">
                    {platoSeleccionado.receta.notas_hildegardianas}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-amber-900 text-amber-100 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-serif text-xl mb-2">{restaurante.nombre}</p>
          <p className="italic text-sm">"{restaurante.tagline}"</p>
          <p className="text-xs mt-4 opacity-75">
            Basado en las revelaciones de Santa Hildegarda de Bingen (1098-1179)
          </p>
        </div>
      </footer>
    </>
  );
}

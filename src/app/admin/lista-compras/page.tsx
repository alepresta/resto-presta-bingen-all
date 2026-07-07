'use client';

import { useState } from 'react';

interface IngredienteLista {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  presentacion: string;
  platosQueLoUsan: string[];
  nutricion: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
}

const CATEGORIAS_INFO: Record<string, { icono: string; nombre: string; color: string }> = {
  verduras: { icono: '🥕', nombre: 'Verduras', color: 'border-green-500 bg-green-50' },
  frutas: { icono: '🍎', nombre: 'Frutas', color: 'border-red-500 bg-red-50' },
  carnes: { icono: '🥩', nombre: 'Carnes', color: 'border-red-700 bg-red-50' },
  pescados: { icono: '🐟', nombre: 'Pescados', color: 'border-blue-500 bg-blue-50' },
  lacteos: { icono: '🧀', nombre: 'Lácteos', color: 'border-yellow-500 bg-yellow-50' },
  granos: { icono: '🌾', nombre: 'Granos/Cereales', color: 'border-amber-600 bg-amber-50' },
  legumbres: { icono: '🫘', nombre: 'Legumbres', color: 'border-orange-600 bg-orange-50' },
  condimentos: { icono: '🧂', nombre: 'Condimentos', color: 'border-gray-500 bg-gray-50' },
  aceites: { icono: '🫒', nombre: 'Aceites', color: 'border-green-700 bg-green-50' },
  bebidas: { icono: '🥤', nombre: 'Bebidas', color: 'border-cyan-500 bg-cyan-50' },
  hierbas: { icono: '🌿', nombre: 'Hierbas', color: 'border-emerald-600 bg-emerald-50' },
  especias: { icono: '🌶️', nombre: 'Especias', color: 'border-red-500 bg-red-50' },
  endulzantes: { icono: '🍯', nombre: 'Endulzantes', color: 'border-amber-500 bg-amber-50' },
  frutos_secos: { icono: '🥜', nombre: 'Frutos Secos', color: 'border-orange-700 bg-orange-50' },
  otros: { icono: '📦', nombre: 'Otros', color: 'border-gray-400 bg-gray-50' },
};

export default function ListaComprasPage() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [cargando, setCargando] = useState(false);
  const [lista, setLista] = useState<IngredienteLista[]>([]);
  const [porCategoria, setPorCategoria] = useState<Record<string, IngredienteLista[]>>({});
  const [resumen, setResumen] = useState<any>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const generarLista = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Seleccioná ambas fechas');
      return;
    }
    setCargando(true);
    setError('');
    setMensaje('');

    try {
      const res = await fetch(
        `/api/admin/lista-compras?inicio=${fechaInicio}&fin=${fechaFin}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setLista(data.lista || []);
      setPorCategoria(data.porCategoria || {});
      setResumen(data.resumen || null);
      
      if (data.mensaje) {
        setMensaje(data.mensaje);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const imprimirLista = () => {
    window.print();
  };

  const exportarCSV = () => {
    const rows = [
      ['Categoría', 'Ingrediente', 'Cantidad', 'Platos que lo usan'],
      ...lista.map((ing) => [
        CATEGORIAS_INFO[ing.categoria]?.nombre || ing.categoria,
        ing.nombre,
        ing.presentacion,
        ing.platosQueLoUsan.join('; '),
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lista-compras-${fechaInicio}-${fechaFin}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🛒 Lista de Compras Inteligente</h1>
            <p className="text-blue-100 text-sm">Calculada desde pedidos confirmados</p>
          </div>
          <a
            href="/admin"
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            ← Panel
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Selector de fechas */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 print:hidden">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Rango de Fechas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generarLista}
                disabled={cargando}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:shadow-lg disabled:opacity-50"
              >
                {cargando ? '⏳ Generando...' : '🔄 Generar Lista'}
              </button>
            </div>
            <div className="flex items-end gap-2">
              {lista.length > 0 && (
                <>
                  <button
                    onClick={imprimirLista}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-semibold"
                    title="Imprimir"
                  >
                    🖨️
                  </button>
                  <button
                    onClick={exportarCSV}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
                    title="Exportar CSV"
                  >
                    📊
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              ❌ {error}
            </div>
          )}
          
          {mensaje && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
              ℹ️ {mensaje}
            </div>
          )}
        </div>

        {/* Resumen general - SOLO si existe */}
        {resumen && resumen.nutricionTotal && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
                <p className="text-xs text-gray-600 font-semibold">PEDIDOS</p>
                <p className="text-2xl font-bold">{resumen.pedidos}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
                <p className="text-xs text-gray-600 font-semibold">PLATOS ÚNICOS</p>
                <p className="text-2xl font-bold">{resumen.totalPlatos}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
                <p className="text-xs text-gray-600 font-semibold">PORCIONES</p>
                <p className="text-2xl font-bold">{resumen.totalPorciones}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
                <p className="text-xs text-gray-600 font-semibold">INGREDIENTES</p>
                <p className="text-2xl font-bold">{resumen.totalIngredientes}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
                <p className="text-xs text-gray-600 font-semibold">🔥 CALORÍAS TOTALES</p>
                <p className="text-2xl font-bold">{resumen.nutricionTotal.calorias.toFixed(0)}</p>
                <p className="text-xs text-gray-500">kcal</p>
              </div>
            </div>

            {/* Nutrición total */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-bold text-amber-800 mb-4">📊 Nutrición Total del Período</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600">🔥 Calorías</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {resumen.nutricionTotal.calorias.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">kcal</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600">💪 Proteínas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {resumen.nutricionTotal.proteinas.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">g</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600">🍞 Carbohidratos</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {resumen.nutricionTotal.carbohidratos.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">g</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600">🥑 Grasas</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {resumen.nutricionTotal.grasas.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">g</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Lista por categorías */}
        {Object.keys(porCategoria).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(porCategoria)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([categoria, ingredientes]) => {
                const info = CATEGORIAS_INFO[categoria] || CATEGORIAS_INFO.otros;
                return (
                  <div
                    key={categoria}
                    className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${info.color.split(' ')[0]}`}
                  >
                    <div className={`p-4 ${info.color.split(' ')[1]} border-b`}>
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-2xl">{info.icono}</span>
                        {info.nombre}
                        <span className="text-sm bg-white px-2 py-1 rounded-full ml-auto">
                          {ingredientes.length} ingredientes
                        </span>
                      </h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {ingredientes
                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                        .map((ing) => (
                          <div key={ing.id} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-gray-800">{ing.nombre}</h3>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                    {ing.presentacion}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="font-semibold">Usado en:</span>{' '}
                                  {ing.platosQueLoUsan.slice(0, 3).join(', ')}
                                  {ing.platosQueLoUsan.length > 3 && (
                                    <span className="text-gray-400">
                                      {' '}
                                      y {ing.platosQueLoUsan.length - 3} más
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                  <span>🔥 {ing.nutricion.calorias.toFixed(0)} kcal</span>
                                  <span>💪 {ing.nutricion.proteinas.toFixed(1)}g prot</span>
                                  <span>🍞 {ing.nutricion.carbohidratos.toFixed(1)}g carb</span>
                                  <span>🥑 {ing.nutricion.grasas.toFixed(1)}g grasa</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          !cargando && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                {mensaje || 'No hay pedidos confirmados en este rango de fechas'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Primero necesitás crear pedidos y confirmarlos
              </p>
            </div>
          )
        )}
      </main>

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface Nutricion {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
  sodio: number;
  calcio: number;
  hierro: number;
  vitaminaC: number;
}

interface PlatoAnalisis {
  plato_id: string;
  nombre: string;
  precio: number;
  nutricion: Nutricion;
  venenos: string[];
  receta: {
    porciones: number;
    tiempo_min: number | null;
    dificultad: string | null;
    pasos: string[];
    notas_hildegardianas: string | null;
    ingredientes: Array<{ nombre: string; cantidad: number; unidad: string; temperamento: string | null; veneno: boolean }>;
  } | null;
}

interface AnalisisData {
  vacio: boolean;
  total: Nutricion;
  promedioDiario: Nutricion | null;
  vdr: Record<string, number>;
  porDia: Record<string, Nutricion & { platos: number }>;
  porPlato: PlatoAnalisis[];
  diasConDatos: number;
  hildegardiano: {
    porcCalido: number;
    porcFrio: number;
    balance: string;
    venenos: string[];
  } | null;
}

interface AnalisisGrupoProps {
  grupoId: string;
  refreshKey: number;
}

const fmt = (n: number, dec = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: dec });

function Macro({ label, valor, unidad, color }: { label: string; valor: number; unidad: string; color: string }) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="text-lg font-bold">
        {fmt(valor, 1)}
        <span className="text-xs font-normal ml-1">{unidad}</span>
      </p>
    </div>
  );
}

export default function AnalisisGrupo({ grupoId, refreshKey }: AnalisisGrupoProps) {
  const [data, setData] = useState<AnalisisData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [platoAbierto, setPlatoAbierto] = useState<string | null>(null);
  const [diasAbiertos, setDiasAbiertos] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      setError('');
      try {
        const res = await fetch(`/api/grupos/${grupoId}/analisis`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error');
        if (activo) setData(json);
      } catch (err: any) {
        if (activo) setError(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [grupoId, refreshKey]);

  if (cargando && !data) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 text-center text-gray-500">
        ⏳ Calculando análisis…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 text-red-600 text-sm">❌ {error}</div>
    );
  }

  if (!data || data.vacio) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 text-center text-gray-500 text-sm">
        Seleccioná platos para ver el análisis nutricional.
      </div>
    );
  }

  const { total, promedioDiario, porDia, porPlato, hildegardiano } = data;

  return (
    <div className="space-y-4">
      {/* Resumen total */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h2 className="font-bold text-gray-800 mb-3">📊 Análisis nutricional del grupo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <Macro label="Calorías" valor={total.calorias} unidad="kcal" color="bg-orange-50 text-orange-800" />
          <Macro label="Proteínas" valor={total.proteinas} unidad="g" color="bg-red-50 text-red-800" />
          <Macro label="Carbohidratos" valor={total.carbohidratos} unidad="g" color="bg-amber-50 text-amber-800" />
          <Macro label="Grasas" valor={total.grasas} unidad="g" color="bg-yellow-50 text-yellow-800" />
          <Macro label="Fibra" valor={total.fibra} unidad="g" color="bg-green-50 text-green-800" />
        </div>
        {promedioDiario && (
          <p className="text-xs text-gray-500 mt-3">
            Promedio diario: {fmt(promedioDiario.calorias)} kcal · {fmt(promedioDiario.proteinas, 1)} g proteínas · {fmt(promedioDiario.fibra, 1)} g fibra
          </p>
        )}
      </div>

      {/* Análisis hildegardiano */}
      {hildegardiano && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-2">🌿 Análisis hildegardiano</h3>
          <p className="text-sm text-gray-700 mb-2">{hildegardiano.balance}</p>
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100">
            <div
              className="bg-orange-500 h-full flex items-center justify-center text-[10px] text-white"
              style={{ width: `${hildegardiano.porcCalido}%` }}
            >
              {hildegardiano.porcCalido > 12 ? `🔥 ${fmt(hildegardiano.porcCalido)}%` : ''}
            </div>
            <div
              className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white"
              style={{ width: `${hildegardiano.porcFrio}%` }}
            >
              {hildegardiano.porcFrio > 12 ? `❄️ ${fmt(hildegardiano.porcFrio)}%` : ''}
            </div>
          </div>
          {hildegardiano.venenos.length > 0 && (
            <p className="text-xs text-red-600 mt-3">
              ⚠️ Venenos hildegardianos presentes: {hildegardiano.venenos.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Por día */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <button
          onClick={() => setDiasAbiertos((v) => !v)}
          className="w-full flex justify-between items-center font-bold text-gray-800"
        >
          <span>📅 Análisis por día</span>
          <span>{diasAbiertos ? '▲' : '▼'}</span>
        </button>
        {diasAbiertos && (
          <div className="mt-3 space-y-2">
            {Object.keys(porDia)
              .sort()
              .map((fecha) => {
                const d = porDia[fecha];
                const [y, m, dd] = fecha.split('-').map(Number);
                const label = new Date(y, m - 1, dd).toLocaleDateString('es-AR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <div key={fecha} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-gray-800 text-sm capitalize">{label}</p>
                      <p className="text-xs text-gray-500">{d.platos} platos</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <span>🔥 {fmt(d.calorias)} kcal</span>
                      <span>💪 {fmt(d.proteinas, 1)} g prot</span>
                      <span>🌾 {fmt(d.fibra, 1)} g fibra</span>
                      <span>🧂 {fmt(d.sodio)} mg sodio</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Por plato (individual + receta) */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-bold text-gray-800 mb-3">🍽️ Análisis individual de cada plato</h3>
        <div className="space-y-2">
          {porPlato.map((p) => {
            const abierto = platoAbierto === p.plato_id;
            return (
              <div key={p.plato_id} className="border rounded-lg">
                <button
                  onClick={() => setPlatoAbierto(abierto ? null : p.plato_id)}
                  className="w-full flex justify-between items-center p-3 text-left"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{p.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {fmt(p.nutricion.calorias)} kcal · {fmt(p.nutricion.proteinas, 1)} g prot · por porción
                    </p>
                  </div>
                  <span className="text-gray-400">{abierto ? '▲' : '▼'}</span>
                </button>

                {abierto && (
                  <div className="px-3 pb-3 border-t pt-3">
                    {/* Macros del plato */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                      <Macro label="Calorías" valor={p.nutricion.calorias} unidad="kcal" color="bg-orange-50 text-orange-800" />
                      <Macro label="Proteínas" valor={p.nutricion.proteinas} unidad="g" color="bg-red-50 text-red-800" />
                      <Macro label="Carbos" valor={p.nutricion.carbohidratos} unidad="g" color="bg-amber-50 text-amber-800" />
                      <Macro label="Grasas" valor={p.nutricion.grasas} unidad="g" color="bg-yellow-50 text-yellow-800" />
                      <Macro label="Fibra" valor={p.nutricion.fibra} unidad="g" color="bg-green-50 text-green-800" />
                    </div>

                    {/* Receta */}
                    {p.receta ? (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="font-semibold text-gray-800 text-sm mb-1">📖 Receta</p>
                        <p className="text-xs text-gray-500 mb-2">
                          {p.receta.porciones} porciones
                          {p.receta.tiempo_min ? ` · ${p.receta.tiempo_min} min` : ''}
                          {p.receta.dificultad ? ` · ${p.receta.dificultad}` : ''}
                        </p>

                        {p.receta.ingredientes.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-gray-700 mt-2 mb-1">Ingredientes</p>
                            <ul className="text-xs text-gray-700 space-y-0.5">
                              {p.receta.ingredientes.map((ing, i) => (
                                <li key={i} className="flex justify-between gap-2">
                                  <span>
                                    {ing.nombre}
                                    {ing.veneno && <span className="text-red-600 ml-1" title="Veneno hildegardiano">⚠️</span>}
                                  </span>
                                  <span className="text-gray-500 whitespace-nowrap">
                                    {ing.cantidad} {ing.unidad}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {p.receta.pasos && p.receta.pasos.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-gray-700 mt-3 mb-1">Preparación</p>
                            <ol className="text-xs text-gray-700 list-decimal list-inside space-y-0.5">
                              {p.receta.pasos.map((paso, i) => (
                                <li key={i}>{paso}</li>
                              ))}
                            </ol>
                          </>
                        )}

                        {p.receta.notas_hildegardianas && (
                          <p className="text-xs text-emerald-700 mt-3 italic">🌿 {p.receta.notas_hildegardianas}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Este plato no tiene receta cargada.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

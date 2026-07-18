'use client';

import { useEffect, useState } from 'react';

interface InformeCompletoProps {
  grupoId: string;
  refreshKey: number;
}

const fmt = (n: number, dec = 0) => (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: dec });

const COLOR_DIAG: Record<string, string> = {
  green: 'bg-green-50 border-green-500 text-green-800',
  yellow: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  orange: 'bg-orange-50 border-orange-500 text-orange-800',
  red: 'bg-red-50 border-red-500 text-red-800',
};

export default function InformeCompleto({ grupoId, refreshKey }: InformeCompletoProps) {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      setError('');
      try {
        const res = await fetch(`/api/grupos/${grupoId}/informe`, { cache: 'no-store' });
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
    return <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 text-center text-gray-500 dark:text-gray-400">⏳ Generando informe completo…</div>;
  }
  if (error) return <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 text-red-600 text-sm">❌ {error}</div>;
  if (!data || data.vacio) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        Seleccioná platos para generar el informe completo.
      </div>
    );
  }

  const h = data.hildegardiano;
  const n = data.nutricional;

  // Tabla comparativa nutricional (completa)
  const filas = [
    { grupo: '🔥 Macronutrientes' },
    { l: 'Calorías', prom: n.promedioDiario?.calorias, u: 'kcal', vdr: n.vdr.calorias, key: 'calorias' },
    { l: 'Proteínas', prom: n.promedioDiario?.proteinas, u: 'g', vdr: n.vdr.proteinas, key: 'proteinas' },
    { l: 'Carbohidratos', prom: n.promedioDiario?.carbohidratos, u: 'g', vdr: n.vdr.carbohidratos, key: 'carbohidratos' },
    { l: 'Grasas', prom: n.promedioDiario?.grasas, u: 'g', vdr: n.vdr.grasas, key: 'grasas' },
    { l: 'Grasas saturadas', prom: n.promedioDiario?.grasas_saturadas, u: 'g', vdr: n.vdr.grasas_saturadas, key: 'grasas_saturadas', max: true },
    { l: 'Fibra', prom: n.promedioDiario?.fibra, u: 'g', vdr: n.vdr.fibra, key: 'fibra' },
    { l: 'Azúcar', prom: n.promedioDiario?.azucar, u: 'g', vdr: n.vdr.azucar, key: 'azucar', max: true },
    { grupo: '⚗️ Minerales' },
    { l: 'Calcio', prom: n.promedioDiario?.calcio, u: 'mg', vdr: n.vdr.calcio, key: 'calcio' },
    { l: 'Hierro', prom: n.promedioDiario?.hierro, u: 'mg', vdr: n.vdr.hierro, key: 'hierro' },
    { l: 'Magnesio', prom: n.promedioDiario?.magnesio, u: 'mg', vdr: n.vdr.magnesio, key: 'magnesio' },
    { l: 'Potasio', prom: n.promedioDiario?.potasio, u: 'mg', vdr: n.vdr.potasio, key: 'potasio' },
    { l: 'Zinc', prom: n.promedioDiario?.zinc, u: 'mg', vdr: n.vdr.zinc, key: 'zinc' },
    { l: 'Fósforo', prom: n.promedioDiario?.fosforo, u: 'mg', vdr: n.vdr.fosforo, key: 'fosforo' },
    { l: 'Sodio', prom: n.promedioDiario?.sodio, u: 'mg', vdr: n.vdr.sodio, key: 'sodio', max: true },
    { grupo: '💊 Vitaminas' },
    { l: 'Vitamina A', prom: n.promedioDiario?.vitaminaA, u: 'mcg', vdr: n.vdr.vitaminaA, key: 'vitaminaA' },
    { l: 'Vitamina C', prom: n.promedioDiario?.vitaminaC, u: 'mg', vdr: n.vdr.vitaminaC, key: 'vitaminaC' },
    { l: 'Vitamina D', prom: n.promedioDiario?.vitaminaD, u: 'mcg', vdr: n.vdr.vitaminaD, key: 'vitaminaD' },
    { l: 'Vitamina E', prom: n.promedioDiario?.vitaminaE, u: 'mg', vdr: n.vdr.vitaminaE, key: 'vitaminaE' },
    { l: 'Vitamina K', prom: n.promedioDiario?.vitaminaK, u: 'mcg', vdr: n.vdr.vitaminaK, key: 'vitaminaK' },
    { l: 'Vitamina B1', prom: n.promedioDiario?.vitaminaB1, u: 'mg', vdr: n.vdr.vitaminaB1, key: 'vitaminaB1' },
    { l: 'Vitamina B2', prom: n.promedioDiario?.vitaminaB2, u: 'mg', vdr: n.vdr.vitaminaB2, key: 'vitaminaB2' },
    { l: 'Vitamina B3', prom: n.promedioDiario?.vitaminaB3, u: 'mg', vdr: n.vdr.vitaminaB3, key: 'vitaminaB3' },
    { l: 'Vitamina B5', prom: n.promedioDiario?.vitaminaB5, u: 'mg', vdr: n.vdr.vitaminaB5, key: 'vitaminaB5' },
    { l: 'Vitamina B6', prom: n.promedioDiario?.vitaminaB6, u: 'mg', vdr: n.vdr.vitaminaB6, key: 'vitaminaB6' },
    { l: 'Vitamina B9', prom: n.promedioDiario?.vitaminaB9, u: 'mcg', vdr: n.vdr.vitaminaB9, key: 'vitaminaB9' },
    { l: 'Vitamina B12', prom: n.promedioDiario?.vitaminaB12, u: 'mcg', vdr: n.vdr.vitaminaB12, key: 'vitaminaB12' },
  ];

  const Barra = ({ label, valor, color }: { label: string; valor: number; color: string }) => (
    <div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-0.5">
        <span>{label}</span>
        <span>{fmt(valor)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(valor, 100)}%` }} />
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex justify-between items-center p-4 font-bold text-gray-800 dark:text-gray-100"
      >
        <span>🧪 Informe completo (hildegardiano + científico)</span>
        <span>{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="px-4 pb-4 space-y-5">
          {/* Diagnóstico */}
          {h?.diagnostico && (
            <div className={`border-l-4 rounded-lg p-4 ${COLOR_DIAG[h.diagnostico.color] || 'bg-gray-50 dark:bg-gray-900 border-gray-400 text-gray-800 dark:text-gray-100'}`}>
              <p className="font-bold">🎯 Diagnóstico: {h.diagnostico.nivel}</p>
              <p className="text-sm mt-1">{h.diagnostico.mensaje}</p>
            </div>
          )}

          {/* Viriditas + Eucrasia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="font-semibold text-gray-800 dark:text-gray-100">🟢 Viriditas (Vigor Verde)</p>
              <p className="text-3xl font-bold text-green-600">{fmt(h.viriditas.puntaje, 1)}<span className="text-base text-gray-400 dark:text-gray-500"> / 10</span></p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{h.viriditas.interpretacion}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="font-semibold text-gray-800 dark:text-gray-100">⚖️ Eucrasia (Balance de Humores)</p>
              <p className="text-3xl font-bold text-amber-600 mb-2">{fmt(h.eucrasia.puntaje, 1)}<span className="text-base text-gray-400 dark:text-gray-500"> / 10</span></p>
              <div className="space-y-2">
                <Barra label="🔥 Cálido" valor={h.eucrasia.calido} color="bg-orange-500" />
                <Barra label="❄️ Frío" valor={h.eucrasia.frio} color="bg-blue-500" />
                <Barra label="☀️ Seco" valor={h.eucrasia.seco} color="bg-yellow-500" />
                <Barra label="💧 Húmedo" valor={h.eucrasia.humedo} color="bg-teal-500" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{h.eucrasia.interpretacion}</p>
            </div>
          </div>

          {/* Venenos + Pilares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="font-semibold text-gray-800 dark:text-gray-100">🚫 Venenos de Cocina ({h.venenos.cantidad})</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{h.venenos.interpretacion}</p>
              {h.venenos.lista.length > 0 && (
                <ul className="mt-2 text-xs text-red-700 space-y-1">
                  {Array.from(new Map(h.venenos.lista.map((v: any) => [v.nombre, v])).values()).map((v: any, i: number) => (
                    <li key={i}>
                      <strong>{v.nombre}</strong>: {v.razon}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border rounded-lg p-4">
              <p className="font-semibold text-gray-800 dark:text-gray-100">✨ Pilares de Alegría ({h.pilares.presentes.length}/4)</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Espelta', 'Hinojo', 'Galanga', 'Castañas'].map((p) => {
                  const ok = h.pilares.presentes.includes(p);
                  return (
                    <span key={p} className={`text-xs px-2 py-1 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                      {ok ? '✅' : '⬜'} {p}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{h.pilares.interpretacion}</p>
            </div>
          </div>

          {/* Maduración + Compensación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="font-semibold text-gray-800 dark:text-gray-100">🔥 Maduración por Fuego</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{fmt(h.maduracion.porcentajeCocido)}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{h.maduracion.interpretacion}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="font-semibold text-gray-800 dark:text-gray-100">🔄 Secuencia Compensatoria</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{fmt(h.compensacion.porcentaje)}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{h.compensacion.interpretacion}</p>
            </div>
          </div>

          {/* Recomendaciones */}
          {h.recomendaciones?.length > 0 && (
            <div className="border rounded-lg p-4 bg-amber-50">
              <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">📋 Recomendaciones Hildegardianas</p>
              <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
                {h.recomendaciones.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Alertas nutricionales */}
          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">🔬 Alertas nutricionales (científico)</p>
            <ul className="text-sm space-y-1">
              {n.alertas.map((a: any, i: number) => (
                <li
                  key={i}
                  className={
                    a.tipo === 'deficit' ? 'text-orange-700' : a.tipo === 'exceso' ? 'text-red-700' : 'text-blue-700'
                  }
                >
                  {a.icono} {a.mensaje}
                </li>
              ))}
            </ul>
          </div>

          {/* Tabla comparativa VDR */}
          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">📊 Menú vs VDR (promedio diario)</p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs min-w-[420px] text-gray-800 dark:text-gray-100">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
                    <th className="py-1 pr-2 font-semibold">Nutriente</th>
                    <th className="py-1 pr-2 font-semibold">Prom/día</th>
                    <th className="py-1 pr-2 font-semibold">VDR</th>
                    <th className="py-1 pr-2 font-semibold">%</th>
                    <th className="py-1 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f: any, i: number) => {
                    if (f.grupo) {
                      return (
                        <tr key={i} className="bg-gray-100 dark:bg-gray-700">
                          <td colSpan={5} className="py-1 px-1 font-semibold text-gray-800 dark:text-gray-100">{f.grupo}</td>
                        </tr>
                      );
                    }
                    const pv = n.porcentajeVDR?.[f.key] ?? 0;
                    const ok = f.max ? pv <= 100 : pv >= 80;
                    return (
                      <tr key={i} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <td className="py-1 pr-2 text-gray-700 dark:text-gray-200">{f.l}</td>
                        <td className="py-1 pr-2 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">{fmt(f.prom, 1)} {f.u}</td>
                        <td className="py-1 pr-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmt(f.vdr)} {f.u}{f.max ? ' (máx)' : ''}</td>
                        <td className="py-1 pr-2 font-semibold text-gray-900 dark:text-gray-100">{fmt(pv)}%</td>
                        <td className={`py-1 font-semibold ${ok ? 'text-green-700' : 'text-orange-700'}`}>{ok ? '✅ OK' : '⚠️ Bajo'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
              Promedio sobre {n.diasConDatos} día(s) con platos{n.diasSinDatos > 0 ? ` · ${n.diasSinDatos} día(s) sin datos` : ''}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

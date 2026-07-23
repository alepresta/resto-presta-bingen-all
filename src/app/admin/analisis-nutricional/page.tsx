'use client';

import { useEffect, useState } from 'react';

function parseFechaLocal(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function fmtFechaCorta(fechaStr: string): string {
  return parseFechaLocal(fechaStr).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const TEMPERAMENTOS_INFO: Record<string, { nombre: string; icono: string; color: string; descripcion: string }> = {
  calido: { nombre: 'Cálido', icono: '🌡️', color: 'bg-orange-500', descripcion: 'Balanceado, moderado' },
  calido_seco: { nombre: 'Cálido-Seco', icono: '🔥', color: 'bg-red-500', descripcion: 'Energizante, estimulante' },
  calido_humedo: { nombre: 'Cálido-Húmedo', icono: '🌊', color: 'bg-amber-500', descripcion: 'Nutritivo, reconfortante' },
  frio: { nombre: 'Frío', icono: '❄️', color: 'bg-blue-500', descripcion: 'Refrescante, calmante' },
  frio_seco: { nombre: 'Frío-Seco', icono: '🍃', color: 'bg-cyan-500', descripcion: 'Limpio, ligero' },
  frio_humedo: { nombre: 'Frío-Húmedo', icono: '💧', color: 'bg-teal-500', descripcion: 'Hidratante, suavizante' },
};

interface Resumen {
  calorias: number; proteinas: number; carbohidratos: number; grasas: number;
  grasas_saturadas: number; fibra: number; azucar: number;
  sodio: number; calcio: number; hierro: number; magnesio: number; potasio: number; zinc: number; fosforo: number;
  vitaminaA: number; vitaminaC: number; vitaminaD: number; vitaminaE: number; vitaminaK: number;
  vitaminaB1: number; vitaminaB2: number; vitaminaB3: number; vitaminaB5: number;
  vitaminaB6: number; vitaminaB9: number; vitaminaB12: number;
  platosTotal: number; porcionesTotal: number;
  promedioDiario: any; porcentajeVDR: any;
  diasConDatos: number; diasTotalesEnRango: number; diasSinDatos: number;
}

interface Alerta {
  tipo: 'exceso' | 'deficit' | 'info';
  mensaje: string; icono: string; nutriente: string; porcentaje: number;
}

interface TemperamentoData {
  calorias: number; peso: number; ingredientes: string[];
}

interface InformeHildegardiano {
  periodo: { inicio: string; fin: string };
  diasAnalizados: number;
  viriditas: { puntaje: number; interpretacion: string };
  eucrasia: {
    puntaje: number; calido: number; frio: number; seco: number; humedo: number;
    interpretacion: string;
  };
  venenos: { cantidad: number; lista: Array<{ nombre: string; peso: number; razon: string }>; interpretacion: string };
  pilares: { presentes: string[]; ausentes: string[]; puntaje: number; interpretacion: string };
  maduracion: { porcentajeCocido: number; pesoCocido: number; pesoCrudo: number; interpretacion: string };
  compensacion: { porcentaje: number; interpretacion: string };
  recomendaciones: string[];
  diagnostico: { nivel: string; mensaje: string; color: string };
}

export default function AnalisisNutricionalPage() {
  const [cargando, setCargando] = useState(false);
  const [tabActiva, setTabActiva] = useState<'nutricional' | 'hildegardiano'>('nutricional');

  // Estado para análisis nutricional
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [porDia, setPorDia] = useState<Record<string, any>>({});
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [temperamentos, setTemperamentos] = useState<Record<string, TemperamentoData>>({});

  // Estado para informe hildegardiano
  const [informe, setInforme] = useState<InformeHildegardiano | null>(null);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Grupos activos para analizar puntualmente
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSel, setGrupoSel] = useState('');

  const analizarGrupo = async (grupoId: string) => {
    if (!grupoId) return;
    setCargando(true);
    setError('');
    setMensaje('');
    try {
      const resN = await fetch(`/api/admin/analisis-nutricional?grupo=${grupoId}`);
      const dataN = await resN.json();
      if (!resN.ok) throw new Error(dataN.error);

      if (dataN.mensaje) {
        setMensaje(dataN.mensaje);
        setResumen(null);
      } else {
        setResumen(dataN.resumen);
        setPorDia(dataN.porDia);
        setAlertas(dataN.alertas);
        setTemperamentos(dataN.temperamentos);
      }

      const resH = await fetch(`/api/admin/analisis-hildegardiano?grupo=${grupoId}`);
      const dataH = await resH.json();
      if (resH.ok && dataH.informe) setInforme(dataH.informe);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Cargar grupos y auto-analizar si viene ?grupo en la URL
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/pedidos/grupos');
        const data = await res.json();
        setGrupos(data.grupos || (Array.isArray(data) ? data : []));
      } catch {
        /* noop */
      }
    })();

    const params = new URLSearchParams(window.location.search);
    const g = params.get('grupo');
    if (g) {
      setGrupoSel(g);
      analizarGrupo(g);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BarraProgreso = ({ valor, maximo, color }: { valor: number; maximo: number; color: string }) => {
    const porcentaje = Math.min((valor / maximo) * 100, 100);
    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${porcentaje}%` }} />
      </div>
    );
  };

  const totalCaloriasTemp = Object.values(temperamentos).reduce((sum, t) => sum + t.calorias, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">📊 Análisis Integral del Menú</h1>
            <p className="text-purple-100 text-sm">Nutrición moderna + Sabiduría hildegardiana</p>
          </div>
          <a href="/admin" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold">
            ← Panel
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Analizar un grupo puntual */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border-l-4 border-emerald-500">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">👥 Analizar un grupo</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Grupo</label>
              <select
                value={grupoSel}
                onChange={(e) => setGrupoSel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccioná un grupo…</option>
                {grupos.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.palabra_secreta} · {g.estado} · {g.fecha_inicio} a {g.fecha_fin}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => analizarGrupo(grupoSel)}
                disabled={cargando || !grupoSel}
                className="w-full bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {cargando ? '⏳ Analizando...' : '🔬 Analizar grupo'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Analiza el grupo elegido usando sus propias fechas (sin importar si está confirmado).
          </p>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">❌ {error}</div>
          )}
          {mensaje && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">ℹ️ {mensaje}</div>
          )}
        </div>

        {/* PESTAÑAS */}
        {resumen && informe && (
          <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTabActiva('nutricional')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                  tabActiva === 'nutricional'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                🧪 Análisis Nutricional
              </button>
              <button
                onClick={() => setTabActiva('hildegardiano')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                  tabActiva === 'hildegardiano'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                🌿 Informe Hildegardiano
              </button>
            </div>

            {/* TAB: ANÁLISIS NUTRICIONAL */}
            {tabActiva === 'nutricional' && (
              <>
                {/* Balance Hildegardiano (simplificado) */}
                {totalCaloriasTemp > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">🌿 Balance de Temperamentos</h2>
                    <div className="space-y-3">
                      {Object.entries(temperamentos)
                        .filter(([, data]) => data.calorias > 0)
                        .sort(([, a], [, b]) => b.calorias - a.calorias)
                        .map(([key, data]) => {
                          const info = TEMPERAMENTOS_INFO[key];
                          const porcentaje = (data.calorias / totalCaloriasTemp) * 100;
                          return (
                            <div key={key}>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{info.icono}</span>
                                  <span className="font-semibold text-gray-800 dark:text-gray-100">{info.nombre}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-gray-800 dark:text-gray-100">{porcentaje.toFixed(1)}%</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({data.calorias.toFixed(0)} kcal)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div className={`h-4 rounded-full ${info.color} transition-all`} style={{ width: `${porcentaje}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Alertas */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">🚨 Alertas Nutricionales</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alertas.map((alerta, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border-l-4 ${
                          alerta.tipo === 'exceso' ? 'bg-red-50 border-red-500 text-red-800' :
                          alerta.tipo === 'deficit' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                          'bg-blue-50 border-blue-500 text-blue-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">{alerta.icono}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{alerta.mensaje}</p>
                            {alerta.porcentaje > 0 && (
                              <div className="mt-2">
                                <BarraProgreso valor={alerta.porcentaje} maximo={150} color={
                                  alerta.porcentaje < 50 ? 'bg-red-500' :
                                  alerta.porcentaje < 80 ? 'bg-yellow-500' :
                                  alerta.porcentaje <= 120 ? 'bg-green-500' : 'bg-orange-500'
                                } />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla comparativa VDR */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">📋 Tabla Comparativa: Menú vs VDR</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Nutriente</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Promedio/día</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">VDR</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">% Cumplimiento</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {[
                          { grupo: '🔥 Macronutrientes' },
                          { nombre: 'Calorías', valor: resumen.promedioDiario.calorias, vdr: 2000, unidad: 'kcal', porcentaje: resumen.porcentajeVDR.calorias, tipo: 'rango' },
                          { nombre: 'Proteínas', valor: resumen.promedioDiario.proteinas, vdr: 50, unidad: 'g', porcentaje: resumen.porcentajeVDR.proteinas, tipo: 'min' },
                          { nombre: 'Carbohidratos', valor: resumen.promedioDiario.carbohidratos, vdr: 275, unidad: 'g', porcentaje: resumen.porcentajeVDR.carbohidratos, tipo: 'rango' },
                          { nombre: 'Grasas totales', valor: resumen.promedioDiario.grasas, vdr: 78, unidad: 'g', porcentaje: resumen.porcentajeVDR.grasas, tipo: 'rango' },
                          { nombre: 'Grasas saturadas', valor: resumen.promedioDiario.grasas_saturadas, vdr: 20, unidad: 'g', porcentaje: resumen.porcentajeVDR.grasas_saturadas, tipo: 'max' },
                          { nombre: 'Azúcar', valor: resumen.promedioDiario.azucar, vdr: 50, unidad: 'g', porcentaje: resumen.porcentajeVDR.azucar, tipo: 'max' },
                          { nombre: 'Fibra', valor: resumen.promedioDiario.fibra, vdr: 25, unidad: 'g', porcentaje: resumen.porcentajeVDR.fibra, tipo: 'min' },
                          { grupo: '⚗️ Minerales' },
                          { nombre: 'Sodio', valor: resumen.promedioDiario.sodio, vdr: 2300, unidad: 'mg', porcentaje: resumen.porcentajeVDR.sodio, tipo: 'max' },
                          { nombre: 'Calcio', valor: resumen.promedioDiario.calcio, vdr: 1000, unidad: 'mg', porcentaje: resumen.porcentajeVDR.calcio, tipo: 'min' },
                          { nombre: 'Hierro', valor: resumen.promedioDiario.hierro, vdr: 18, unidad: 'mg', porcentaje: resumen.porcentajeVDR.hierro, tipo: 'min' },
                          { nombre: 'Magnesio', valor: resumen.promedioDiario.magnesio, vdr: 400, unidad: 'mg', porcentaje: resumen.porcentajeVDR.magnesio, tipo: 'min' },
                          { nombre: 'Potasio', valor: resumen.promedioDiario.potasio, vdr: 3500, unidad: 'mg', porcentaje: resumen.porcentajeVDR.potasio, tipo: 'min' },
                          { nombre: 'Zinc', valor: resumen.promedioDiario.zinc, vdr: 15, unidad: 'mg', porcentaje: resumen.porcentajeVDR.zinc, tipo: 'min' },
                          { nombre: 'Fósforo', valor: resumen.promedioDiario.fosforo, vdr: 1000, unidad: 'mg', porcentaje: resumen.porcentajeVDR.fosforo, tipo: 'min' },
                          { grupo: '💊 Vitaminas' },
                          { nombre: 'Vitamina A', valor: resumen.promedioDiario.vitaminaA, vdr: 900, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaA, tipo: 'min' },
                          { nombre: 'Vitamina C', valor: resumen.promedioDiario.vitaminaC, vdr: 90, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaC, tipo: 'min' },
                          { nombre: 'Vitamina D', valor: resumen.promedioDiario.vitaminaD, vdr: 20, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaD, tipo: 'min' },
                          { nombre: 'Vitamina E', valor: resumen.promedioDiario.vitaminaE, vdr: 15, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaE, tipo: 'min' },
                          { nombre: 'Vitamina K', valor: resumen.promedioDiario.vitaminaK, vdr: 120, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaK, tipo: 'min' },
                          { nombre: 'Vitamina B1', valor: resumen.promedioDiario.vitaminaB1, vdr: 1.2, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaB1, tipo: 'min' },
                          { nombre: 'Vitamina B2', valor: resumen.promedioDiario.vitaminaB2, vdr: 1.3, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaB2, tipo: 'min' },
                          { nombre: 'Vitamina B3', valor: resumen.promedioDiario.vitaminaB3, vdr: 16, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaB3, tipo: 'min' },
                          { nombre: 'Vitamina B5', valor: resumen.promedioDiario.vitaminaB5, vdr: 5, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaB5, tipo: 'min' },
                          { nombre: 'Vitamina B6', valor: resumen.promedioDiario.vitaminaB6, vdr: 1.7, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaB6, tipo: 'min' },
                          { nombre: 'Vitamina B9 (Folato)', valor: resumen.promedioDiario.vitaminaB9, vdr: 400, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaB9, tipo: 'min' },
                          { nombre: 'Vitamina B12', valor: resumen.promedioDiario.vitaminaB12, vdr: 2.4, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaB12, tipo: 'min' },
                        ].map((row: any, i: number) => (
                          row.grupo ? (
                            <tr key={i} className="bg-gray-50 dark:bg-gray-900">
                              <td colSpan={5} className="px-4 py-2 font-bold text-gray-700 dark:text-gray-200">{row.grupo}</td>
                            </tr>
                          ) : (
                            <tr key={i}>
                              <td className="px-4 py-3">{row.nombre}</td>
                              <td className="px-4 py-3 text-right font-semibold">{Number(row.valor).toFixed(1)} {row.unidad}</td>
                              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{row.vdr} {row.unidad}{row.tipo === 'max' ? ' (máx)' : ''}</td>
                              <td className="px-4 py-3 text-right font-bold">{Number(row.porcentaje).toFixed(0)}%</td>
                              <td className="px-4 py-3 text-center">
                                {(() => {
                                  const p = Number(row.porcentaje);
                                  let cls = 'bg-yellow-100 text-yellow-700';
                                  let txt = '⚠️ Bajo';
                                  if (row.tipo === 'max') {
                                    if (p <= 100) { cls = 'bg-green-100 text-green-700'; txt = '✅ OK'; }
                                    else { cls = 'bg-red-100 text-red-700'; txt = '⚠️ Exceso'; }
                                  } else if (row.tipo === 'rango') {
                                    if (p >= 80 && p <= 120) { cls = 'bg-green-100 text-green-700'; txt = '✅ OK'; }
                                    else if (p < 80) { cls = 'bg-yellow-100 text-yellow-700'; txt = '⚠️ Bajo'; }
                                    else { cls = 'bg-red-100 text-red-700'; txt = '⚠️ Alto'; }
                                  } else {
                                    if (p >= 80) { cls = 'bg-green-100 text-green-700'; txt = '✅ OK'; }
                                  }
                                  return <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>{txt}</span>;
                                })()}
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Desglose diario */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">📅 Desglose Diario</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Fecha</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Platos</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">🔥 kcal</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">💪 Prot</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">🍞 Carbs</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">🥑 Grasas</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">🧂 Sodio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(porDia)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([fecha, data]: [string, any]) => (
                            <tr key={fecha} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">
                                {fmtFechaCorta(fecha)}
                              </td>
                              <td className="px-4 py-3 text-right">{data.platos}</td>
                              <td className="px-4 py-3 text-right font-semibold text-amber-600">{data.calorias.toFixed(0)}</td>
                              <td className="px-4 py-3 text-right text-blue-600">{data.proteinas.toFixed(1)}g</td>
                              <td className="px-4 py-3 text-right text-orange-600">{data.carbohidratos.toFixed(1)}g</td>
                              <td className="px-4 py-3 text-right text-yellow-600">{data.grasas.toFixed(1)}g</td>
                              <td className="px-4 py-3 text-right">
                                <span className={data.sodio > 2300 ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-200'}>
                                  {data.sodio.toFixed(0)} mg
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* TAB: INFORME HILGARDIANO */}
            {tabActiva === 'hildegardiano' && informe && (
              <>
                {/* Diagnóstico Final */}
                <div className={`rounded-xl shadow-md p-6 mb-6 border-l-8 ${
                  informe.diagnostico.color === 'green' ? 'bg-green-50 border-green-500' :
                  informe.diagnostico.color === 'yellow' ? 'bg-yellow-50 border-yellow-500' :
                  informe.diagnostico.color === 'orange' ? 'bg-orange-50 border-orange-500' :
                  'bg-red-50 border-red-500'
                }`}>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    🎯 Diagnóstico Final: {informe.diagnostico.nivel}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-200 text-lg">{informe.diagnostico.mensaje}</p>
                </div>

                {/* Grid de índices principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* 🟢 VIRIDITAS */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-8 border-green-500">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">🟢 Viriditas (Vigor Verde)</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-green-600">
                        {informe.viriditas.puntaje.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">/ 10</div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
                      <div
                        className="h-3 rounded-full bg-green-500 transition-all"
                        style={{ width: `${(informe.viriditas.puntaje / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{informe.viriditas.interpretacion}</p>
                  </div>

                  {/* ⚖️ EUCRASIA */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-8 border-blue-500">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">⚖️ Eucrasia (Balance de Humores)</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-blue-600">
                        {informe.eucrasia.puntaje.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">/ 10</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-red-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-300">🔥 Cálido</p>
                        <p className="font-bold text-red-600">{informe.eucrasia.calido.toFixed(0)}%</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-300">❄️ Frío</p>
                        <p className="font-bold text-blue-600">{informe.eucrasia.frio.toFixed(0)}%</p>
                      </div>
                      <div className="bg-amber-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-300">☀️ Seco</p>
                        <p className="font-bold text-amber-600">{informe.eucrasia.seco.toFixed(0)}%</p>
                      </div>
                      <div className="bg-teal-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-300">💧 Húmedo</p>
                        <p className="font-bold text-teal-600">{informe.eucrasia.humedo.toFixed(0)}%</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{informe.eucrasia.interpretacion}</p>
                  </div>
                </div>

                {/* Grid secundario */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* 🚫 VENENOS */}
                  <div className={`rounded-xl shadow-md p-6 border-l-8 ${
                    informe.venenos.cantidad === 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                  }`}>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">🚫 Venenos de Cocina</h3>
                    <div className="text-5xl font-bold mb-3">
                      {informe.venenos.cantidad === 0 ? (
                        <span className="text-green-600">✅</span>
                      ) : (
                        <span className="text-red-600">{informe.venenos.cantidad}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">{informe.venenos.interpretacion}</p>
                    {informe.venenos.cantidad > 0 && (
                      <div className="space-y-2 mt-3">
                        {[...new Set(informe.venenos.lista.map(v => v.nombre))].map((nombre, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 p-2 rounded text-xs">
                            <p className="font-semibold text-red-700">{nombre}</p>
                            <p className="text-gray-600 dark:text-gray-300">{informe.venenos.lista.find(v => v.nombre === nombre)?.razon}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ✨ PILARES DE ALEGRÍA */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-8 border-purple-500">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">✨ Pilares de Alegría</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-purple-600">
                        {informe.pilares.presentes.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">/ 4</div>
                    </div>
                    <div className="space-y-1 mb-3">
                      {['Espelta', 'Hinojo', 'Galanga', 'Castañas'].map((pilar) => (
                        <div key={pilar} className="flex items-center gap-2">
                          <span>{informe.pilares.presentes.includes(pilar) ? '✅' : '❌'}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-200">{pilar}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{informe.pilares.interpretacion}</p>
                  </div>

                  {/* 🔥 MADURACIÓN POR FUEGO */}
                  <div className={`rounded-xl shadow-md p-6 border-l-8 ${
                    informe.maduracion.porcentajeCocido >= 85 ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'
                  }`}>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">🔥 Maduración por Fuego</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-orange-600">
                        {informe.maduracion.porcentajeCocido.toFixed(0)}%
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          informe.maduracion.porcentajeCocido >= 85 ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${informe.maduracion.porcentajeCocido}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{informe.maduracion.interpretacion}</p>
                  </div>
                </div>

                {/* 🔄 COMPENSACIÓN */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">🔄 Secuencia Compensatoria</h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-4xl font-bold text-cyan-600">
                      {informe.compensacion.porcentaje.toFixed(0)}%
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-cyan-500 transition-all"
                          style={{ width: `${informe.compensacion.porcentaje}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{informe.compensacion.interpretacion}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Hildegarda: "Después de un alimento seco debe seguir uno húmedo para que se equilibren"
                  </p>
                </div>

                {/* 📋 RECOMENDACIONES */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-md p-6 border-l-8 border-amber-500">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">📋 Recomendaciones Hildegardianas</h3>
                  <div className="space-y-3">
                    {informe.recomendaciones.map((rec, i) => (
                      <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <p className="text-gray-800 dark:text-gray-100">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';

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
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroTemperamento, setFiltroTemperamento] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [tabActiva, setTabActiva] = useState<'nutricional' | 'hildegardiano'>('nutricional');
  
  // Estado para análisis nutricional
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [porDia, setPorDia] = useState<Record<string, any>>({});
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [temperamentos, setTemperamentos] = useState<Record<string, TemperamentoData>>({});
  const [filtroAplicado, setFiltroAplicado] = useState<string | null>(null);
  
  // Estado para informe hildegardiano
  const [informe, setInforme] = useState<InformeHildegardiano | null>(null);
  
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const analizar = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Seleccioná ambas fechas');
      return;
    }
    setCargando(true);
    setError('');
    setMensaje('');

    try {
      // Análisis nutricional
      const urlNutricional = `/api/admin/analisis-nutricional?inicio=${fechaInicio}&fin=${fechaFin}${filtroTemperamento ? `&temperamento=${filtroTemperamento}` : ''}`;
      const resNutricional = await fetch(urlNutricional);
      const dataNutricional = await resNutricional.json();

      if (!resNutricional.ok) throw new Error(dataNutricional.error);

      if (dataNutricional.mensaje) {
        setMensaje(dataNutricional.mensaje);
        setResumen(null);
      } else {
        setResumen(dataNutricional.resumen);
        setPorDia(dataNutricional.porDia);
        setAlertas(dataNutricional.alertas);
        setTemperamentos(dataNutricional.temperamentos);
        setFiltroAplicado(dataNutricional.filtroAplicado);
      }

      // Informe hildegardiano
      const urlHildegardiano = `/api/admin/analisis-hildegardiano?inicio=${fechaInicio}&fin=${fechaFin}`;
      const resHildegardiano = await fetch(urlHildegardiano);
      const dataHildegardiano = await resHildegardiano.json();

      if (resHildegardiano.ok && dataHildegardiano.informe) {
        setInforme(dataHildegardiano.informe);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const BarraProgreso = ({ valor, maximo, color }: { valor: number; maximo: number; color: string }) => {
    const porcentaje = Math.min((valor / maximo) * 100, 100);
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${porcentaje}%` }} />
      </div>
    );
  };

  const totalCaloriasTemp = Object.values(temperamentos).reduce((sum, t) => sum + t.calorias, 0);

  return (
    <div className="min-h-screen bg-gray-50">
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
        {/* Selector de fechas + filtro */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Seleccionar Período y Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">🌿 Filtro Hildegardiano</label>
              <select
                value={filtroTemperamento}
                onChange={(e) => setFiltroTemperamento(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos los temperamentos</option>
                {Object.entries(TEMPERAMENTOS_INFO).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.icono} {info.nombre} - {info.descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={analizar}
                disabled={cargando}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-6 rounded-lg hover:shadow-lg disabled:opacity-50"
              >
                {cargando ? '⏳ Analizando...' : '🔬 Analizar Menú'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">❌ {error}</div>
          )}
          {mensaje && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">ℹ️ {mensaje}</div>
          )}
          {filtroAplicado && (
            <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 px-4 py-3 rounded">
              <p className="text-sm text-amber-800">
                🔍 <strong>Filtro aplicado:</strong> Mostrando solo ingredientes con temperamento "{TEMPERAMENTOS_INFO[filtroAplicado]?.nombre}"
              </p>
            </div>
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
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                🧪 Análisis Nutricional
              </button>
              <button
                onClick={() => setTabActiva('hildegardiano')}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                  tabActiva === 'hildegardiano'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                🌿 Informe Hildegardiano
              </button>
            </div>

            {/* TAB: ANÁLISIS NUTRICIONAL */}
            {tabActiva === 'nutricional' && (
              <>
                {/* Balance Hildegardiano (simplificado) */}
                {totalCaloriasTemp > 0 && !filtroAplicado && (
                  <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">🌿 Balance de Temperamentos</h2>
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
                                  <span className="font-semibold text-gray-800">{info.nombre}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-gray-800">{porcentaje.toFixed(1)}%</span>
                                  <span className="text-xs text-gray-500 ml-2">({data.calorias.toFixed(0)} kcal)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-4">
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
                  <h2 className="text-xl font-bold text-gray-800 mb-4">🚨 Alertas Nutricionales</h2>
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
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Tabla Comparativa: Menú vs VDR</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Nutriente</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">Promedio/día</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">VDR</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">% Cumplimiento</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-2 font-bold text-gray-700">🔥 Macronutrientes</td>
                        </tr>
                        {[
                          { nombre: 'Calorías', valor: resumen.promedioDiario.calorias, vdr: 2000, unidad: 'kcal', porcentaje: resumen.porcentajeVDR.calorias, rango: true },
                          { nombre: 'Proteínas', valor: resumen.promedioDiario.proteinas, vdr: 50, unidad: 'g', porcentaje: resumen.porcentajeVDR.proteinas },
                          { nombre: 'Carbohidratos', valor: resumen.promedioDiario.carbohidratos, vdr: 275, unidad: 'g', porcentaje: resumen.porcentajeVDR.carbohidratos },
                          { nombre: 'Grasas totales', valor: resumen.promedioDiario.grasas, vdr: 78, unidad: 'g', porcentaje: resumen.porcentajeVDR.grasas, rango: true },
                          { nombre: 'Fibra', valor: resumen.promedioDiario.fibra, vdr: 25, unidad: 'g', porcentaje: resumen.porcentajeVDR.fibra },
                        ].map((n, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3">{n.nombre}</td>
                            <td className="px-4 py-3 text-right font-semibold">{n.valor.toFixed(1)} {n.unidad}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{n.vdr} {n.unidad}</td>
                            <td className="px-4 py-3 text-right font-bold">{n.porcentaje.toFixed(0)}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                n.rango
                                  ? n.porcentaje >= 80 && n.porcentaje <= 120 ? 'bg-green-100 text-green-700' :
                                    n.porcentaje < 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                  : n.porcentaje >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {n.rango
                                  ? n.porcentaje >= 80 && n.porcentaje <= 120 ? '✅ OK' : n.porcentaje < 80 ? '⚠️ Bajo' : '⚠️ Alto'
                                  : n.porcentaje >= 80 ? '✅ OK' : '⚠️ Bajo'}
                              </span>
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-2 font-bold text-gray-700">⚗️ Minerales Esenciales</td>
                        </tr>
                        {[
                          { nombre: 'Calcio', valor: resumen.promedioDiario.calcio, vdr: 1000, unidad: 'mg', porcentaje: resumen.porcentajeVDR.calcio },
                          { nombre: 'Hierro', valor: resumen.promedioDiario.hierro, vdr: 18, unidad: 'mg', porcentaje: resumen.porcentajeVDR.hierro },
                          { nombre: 'Sodio', valor: resumen.promedioDiario.sodio, vdr: 2300, unidad: 'mg', porcentaje: resumen.porcentajeVDR.sodio, esMaximo: true },
                        ].map((m, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3">{m.nombre}</td>
                            <td className="px-4 py-3 text-right font-semibold">{m.valor.toFixed(1)} {m.unidad}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{m.vdr} {m.unidad}{m.esMaximo ? ' (máx)' : ''}</td>
                            <td className="px-4 py-3 text-right font-bold">{m.porcentaje.toFixed(0)}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                m.esMaximo
                                  ? m.porcentaje <= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  : m.porcentaje >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {m.esMaximo ? m.porcentaje <= 100 ? '✅ OK' : '⚠️ Exceso' : m.porcentaje >= 80 ? '✅ OK' : '⚠️ Bajo'}
                              </span>
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-2 font-bold text-gray-700">💊 Vitaminas</td>
                        </tr>
                        {[
                          { nombre: 'Vitamina A', valor: resumen.promedioDiario.vitaminaA, vdr: 900, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaA },
                          { nombre: 'Vitamina C', valor: resumen.promedioDiario.vitaminaC, vdr: 90, unidad: 'mg', porcentaje: resumen.porcentajeVDR.vitaminaC },
                          { nombre: 'Vitamina D', valor: resumen.promedioDiario.vitaminaD, vdr: 20, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaD },
                          { nombre: 'Vitamina B12', valor: resumen.promedioDiario.vitaminaB12, vdr: 2.4, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaB12 },
                          { nombre: 'Vitamina B9 (Folato)', valor: resumen.promedioDiario.vitaminaB9, vdr: 400, unidad: 'mcg', porcentaje: resumen.porcentajeVDR.vitaminaB9 },
                        ].map((v, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3">{v.nombre}</td>
                            <td className="px-4 py-3 text-right font-semibold">{v.valor.toFixed(1)} {v.unidad}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{v.vdr} {v.unidad}</td>
                            <td className="px-4 py-3 text-right font-bold">{v.porcentaje.toFixed(0)}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                v.porcentaje >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {v.porcentaje >= 80 ? '✅ OK' : '⚠️ Bajo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Desglose diario */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">📅 Desglose Diario</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">Platos</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">🔥 kcal</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">💪 Prot</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">🍞 Carbs</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">🥑 Grasas</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">🧂 Sodio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(porDia)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([fecha, data]: [string, any]) => (
                            <tr key={fecha} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-semibold text-gray-800">
                                {new Date(fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </td>
                              <td className="px-4 py-3 text-right">{data.platos}</td>
                              <td className="px-4 py-3 text-right font-semibold text-amber-600">{data.calorias.toFixed(0)}</td>
                              <td className="px-4 py-3 text-right text-blue-600">{data.proteinas.toFixed(1)}g</td>
                              <td className="px-4 py-3 text-right text-orange-600">{data.carbohidratos.toFixed(1)}g</td>
                              <td className="px-4 py-3 text-right text-yellow-600">{data.grasas.toFixed(1)}g</td>
                              <td className="px-4 py-3 text-right">
                                <span className={data.sodio > 2300 ? 'text-red-600 font-bold' : 'text-gray-700'}>
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
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    🎯 Diagnóstico Final: {informe.diagnostico.nivel}
                  </h2>
                  <p className="text-gray-700 text-lg">{informe.diagnostico.mensaje}</p>
                </div>

                {/* Grid de índices principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* 🟢 VIRIDITAS */}
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-8 border-green-500">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">🟢 Viriditas (Vigor Verde)</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-green-600">
                        {informe.viriditas.puntaje.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">/ 10</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                      <div
                        className="h-3 rounded-full bg-green-500 transition-all"
                        style={{ width: `${(informe.viriditas.puntaje / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-700">{informe.viriditas.interpretacion}</p>
                  </div>

                  {/* ⚖️ EUCRASIA */}
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-8 border-blue-500">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">⚖️ Eucrasia (Balance de Humores)</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-blue-600">
                        {informe.eucrasia.puntaje.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">/ 10</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-red-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600">🔥 Cálido</p>
                        <p className="font-bold text-red-600">{informe.eucrasia.calido.toFixed(0)}%</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600">❄️ Frío</p>
                        <p className="font-bold text-blue-600">{informe.eucrasia.frio.toFixed(0)}%</p>
                      </div>
                      <div className="bg-amber-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600">☀️ Seco</p>
                        <p className="font-bold text-amber-600">{informe.eucrasia.seco.toFixed(0)}%</p>
                      </div>
                      <div className="bg-teal-50 p-2 rounded text-center">
                        <p className="text-xs text-gray-600">💧 Húmedo</p>
                        <p className="font-bold text-teal-600">{informe.eucrasia.humedo.toFixed(0)}%</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{informe.eucrasia.interpretacion}</p>
                  </div>
                </div>

                {/* Grid secundario */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* 🚫 VENENOS */}
                  <div className={`rounded-xl shadow-md p-6 border-l-8 ${
                    informe.venenos.cantidad === 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                  }`}>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">🚫 Venenos de Cocina</h3>
                    <div className="text-5xl font-bold mb-3">
                      {informe.venenos.cantidad === 0 ? (
                        <span className="text-green-600">✅</span>
                      ) : (
                        <span className="text-red-600">{informe.venenos.cantidad}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{informe.venenos.interpretacion}</p>
                    {informe.venenos.cantidad > 0 && (
                      <div className="space-y-2 mt-3">
                        {[...new Set(informe.venenos.lista.map(v => v.nombre))].map((nombre, i) => (
                          <div key={i} className="bg-white p-2 rounded text-xs">
                            <p className="font-semibold text-red-700">{nombre}</p>
                            <p className="text-gray-600">{informe.venenos.lista.find(v => v.nombre === nombre)?.razon}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ✨ PILARES DE ALEGRÍA */}
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-8 border-purple-500">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">✨ Pilares de Alegría</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-purple-600">
                        {informe.pilares.presentes.length}
                      </div>
                      <div className="text-sm text-gray-600">/ 4</div>
                    </div>
                    <div className="space-y-1 mb-3">
                      {['Espelta', 'Hinojo', 'Galanga', 'Castañas'].map((pilar) => (
                        <div key={pilar} className="flex items-center gap-2">
                          <span>{informe.pilares.presentes.includes(pilar) ? '✅' : '❌'}</span>
                          <span className="text-sm text-gray-700">{pilar}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700">{informe.pilares.interpretacion}</p>
                  </div>

                  {/* 🔥 MADURACIÓN POR FUEGO */}
                  <div className={`rounded-xl shadow-md p-6 border-l-8 ${
                    informe.maduracion.porcentajeCocido >= 85 ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'
                  }`}>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">🔥 Maduración por Fuego</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-5xl font-bold text-orange-600">
                        {informe.maduracion.porcentajeCocido.toFixed(0)}%
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          informe.maduracion.porcentajeCocido >= 85 ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${informe.maduracion.porcentajeCocido}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-700">{informe.maduracion.interpretacion}</p>
                  </div>
                </div>

                {/* 🔄 COMPENSACIÓN */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">🔄 Secuencia Compensatoria</h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-4xl font-bold text-cyan-600">
                      {informe.compensacion.porcentaje.toFixed(0)}%
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-cyan-500 transition-all"
                          style={{ width: `${informe.compensacion.porcentaje}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{informe.compensacion.interpretacion}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Hildegarda: "Después de un alimento seco debe seguir uno húmedo para que se equilibren"
                  </p>
                </div>

                {/* 📋 RECOMENDACIONES */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-md p-6 border-l-8 border-amber-500">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Recomendaciones Hildegardianas</h3>
                  <div className="space-y-3">
                    {informe.recomendaciones.map((rec, i) => (
                      <div key={i} className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-gray-800">{rec}</p>
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

'use client';

import { useState } from 'react';

interface Resumen {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  grasas_saturadas: number;
  fibra: number;
  azucar: number;
  sodio: number;
  calcio: number;
  hierro: number;
  magnesio: number;
  potasio: number;
  zinc: number;
  fosforo: number;
  cobre: number;
  manganeso: number;
  selenio: number;
  yodo: number;
  vitaminaA: number;
  vitaminaC: number;
  vitaminaD: number;
  vitaminaE: number;
  vitaminaK: number;
  vitaminaB1: number;
  vitaminaB2: number;
  vitaminaB3: number;
  vitaminaB5: number;
  vitaminaB6: number;
  vitaminaB9: number;
  vitaminaB12: number;
  platosTotal: number;
  porcionesTotal: number;
  promedioDiario: any;
  porcentajeVDR: any;
  diasConDatos: number;
  diasTotalesEnRango: number;
  diasSinDatos: number;
}

interface Alerta {
  tipo: 'exceso' | 'deficit' | 'info';
  mensaje: string;
  icono: string;
  nutriente: string;
  porcentaje: number;
}

export default function AnalisisNutricionalPage() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [porDia, setPorDia] = useState<Record<string, any>>({});
  const [alertas, setAlertas] = useState<Alerta[]>([]);
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
      const res = await fetch(`/api/admin/analisis-nutricional?inicio=${fechaInicio}&fin=${fechaFin}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.mensaje) {
        setMensaje(data.mensaje);
        setResumen(null);
      } else {
        setResumen(data.resumen);
        setPorDia(data.porDia);
        setAlertas(data.alertas);
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

  const getColorPorcentaje = (porcentaje: number): string => {
    if (porcentaje < 50) return 'bg-red-500';
    if (porcentaje < 80) return 'bg-yellow-500';
    if (porcentaje <= 120) return 'bg-green-500';
    return 'bg-orange-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">📊 Análisis Nutricional Avanzado</h1>
            <p className="text-purple-100 text-sm">Balance del menú con Valores Diarios de Referencia (VDR)</p>
          </div>
          <a href="/admin" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold">
            ← Panel
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Selector de fechas */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Seleccionar Período</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {resumen && (
          <>
            {/* Info de días */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">📅</span>
                <div>
                  <h3 className="font-bold text-blue-900">Información del Análisis</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Rango:</strong> {resumen.diasTotalesEnRango} días totales
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Días con platos:</strong> {resumen.diasConDatos} día(s)
                  </p>
                  {resumen.diasSinDatos > 0 && (
                    <p className="text-sm text-orange-700 font-semibold mt-1">
                      ⚠️ {resumen.diasSinDatos} día(s) sin platos seleccionados (no incluidos en el promedio)
                    </p>
                  )}
                  <p className="text-xs text-blue-700 mt-2 italic">
                    El promedio diario se calcula solo sobre los días que tienen platos seleccionados.
                  </p>
                </div>
              </div>
            </div>

            {/* Alertas */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🚨 Alertas Nutricionales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alertas.map((alerta, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border-l-4 ${
                      alerta.tipo === 'exceso'
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : alerta.tipo === 'deficit'
                        ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                        : 'bg-blue-50 border-blue-500 text-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{alerta.icono}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{alerta.mensaje}</p>
                        {alerta.porcentaje > 0 && (
                          <div className="mt-2">
                            <BarraProgreso
                              valor={alerta.porcentaje}
                              maximo={150}
                              color={getColorPorcentaje(alerta.porcentaje)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla comparativa */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Tabla Comparativa: Menú vs VDR</h2>
              <p className="text-sm text-gray-600 mb-4">
                Promedio diario calculado sobre <strong>{resumen.diasConDatos} día(s)</strong> con platos seleccionados
              </p>
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
                    <tr>
                      <td className="px-4 py-3">Calorías</td>
                      <td className="px-4 py-3 text-right font-semibold">{resumen.promedioDiario.calorias.toFixed(0)} kcal</td>
                      <td className="px-4 py-3 text-right text-gray-600">2000 kcal</td>
                      <td className="px-4 py-3 text-right font-bold">{resumen.porcentajeVDR.calorias.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          resumen.porcentajeVDR.calorias >= 80 && resumen.porcentajeVDR.calorias <= 120 ? 'bg-green-100 text-green-700' :
                          resumen.porcentajeVDR.calorias < 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {resumen.porcentajeVDR.calorias >= 80 && resumen.porcentajeVDR.calorias <= 120 ? '✅ OK' :
                           resumen.porcentajeVDR.calorias < 80 ? '⚠️ Bajo' : '⚠️ Alto'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Proteínas</td>
                      <td className="px-4 py-3 text-right font-semibold">{resumen.promedioDiario.proteinas.toFixed(1)} g</td>
                      <td className="px-4 py-3 text-right text-gray-600">50 g</td>
                      <td className="px-4 py-3 text-right font-bold">{resumen.porcentajeVDR.proteinas.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          resumen.porcentajeVDR.proteinas >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {resumen.porcentajeVDR.proteinas >= 80 ? '✅ OK' : '⚠️ Bajo'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Carbohidratos</td>
                      <td className="px-4 py-3 text-right font-semibold">{resumen.promedioDiario.carbohidratos.toFixed(1)} g</td>
                      <td className="px-4 py-3 text-right text-gray-600">275 g</td>
                      <td className="px-4 py-3 text-right font-bold">{resumen.porcentajeVDR.carbohidratos.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          resumen.porcentajeVDR.carbohidratos >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {resumen.porcentajeVDR.carbohidratos >= 80 ? '✅ OK' : '⚠️ Bajo'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Grasas totales</td>
                      <td className="px-4 py-3 text-right font-semibold">{resumen.promedioDiario.grasas.toFixed(1)} g</td>
                      <td className="px-4 py-3 text-right text-gray-600">78 g</td>
                      <td className="px-4 py-3 text-right font-bold">{resumen.porcentajeVDR.grasas.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          resumen.porcentajeVDR.grasas >= 80 && resumen.porcentajeVDR.grasas <= 120 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {resumen.porcentajeVDR.grasas >= 80 && resumen.porcentajeVDR.grasas <= 120 ? '✅ OK' : '⚠️'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Fibra</td>
                      <td className="px-4 py-3 text-right font-semibold">{resumen.promedioDiario.fibra.toFixed(1)} g</td>
                      <td className="px-4 py-3 text-right text-gray-600">25 g</td>
                      <td className="px-4 py-3 text-right font-bold">{resumen.porcentajeVDR.fibra.toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          resumen.porcentajeVDR.fibra >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {resumen.porcentajeVDR.fibra >= 80 ? '✅ OK' : '⚠️ Bajo'}
                        </span>
                      </td>
                    </tr>

                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-2 font-bold text-gray-700">⚗️ Minerales Esenciales</td>
                    </tr>
                    {[
                      { nombre: 'Calcio', valor: resumen.promedioDiario.calcio, vdr: 1000, unidad: 'mg', porcentaje: resumen.porcentajeVDR.calcio },
                      { nombre: 'Hierro', valor: resumen.promedioDiario.hierro, vdr: 18, unidad: 'mg', porcentaje: resumen.porcentajeVDR.hierro },
                      { nombre: 'Magnesio', valor: resumen.promedioDiario.magnesio, vdr: 400, unidad: 'mg', porcentaje: (resumen.promedioDiario.magnesio / 400) * 100 },
                      { nombre: 'Potasio', valor: resumen.promedioDiario.potasio, vdr: 3500, unidad: 'mg', porcentaje: resumen.porcentajeVDR.potasio },
                      { nombre: 'Zinc', valor: resumen.promedioDiario.zinc, vdr: 15, unidad: 'mg', porcentaje: (resumen.promedioDiario.zinc / 15) * 100 },
                      { nombre: 'Fósforo', valor: resumen.promedioDiario.fosforo, vdr: 1000, unidad: 'mg', porcentaje: (resumen.promedioDiario.fosforo / 1000) * 100 },
                      { nombre: 'Sodio', valor: resumen.promedioDiario.sodio, vdr: 2300, unidad: 'mg', porcentaje: resumen.porcentajeVDR.sodio, esMaximo: true },
                    ].map((mineral, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">{mineral.nombre}</td>
                        <td className="px-4 py-3 text-right font-semibold">{mineral.valor.toFixed(1)} {mineral.unidad}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{mineral.vdr} {mineral.unidad}{mineral.esMaximo ? ' (máx)' : ''}</td>
                        <td className="px-4 py-3 text-right font-bold">{mineral.porcentaje.toFixed(0)}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            mineral.esMaximo
                              ? mineral.porcentaje <= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              : mineral.porcentaje >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {mineral.esMaximo
                              ? mineral.porcentaje <= 100 ? '✅ OK' : '⚠️ Exceso'
                              : mineral.porcentaje >= 80 ? '✅ OK' : '⚠️ Bajo'}
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
                    ].map((vit, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">{vit.nombre}</td>
                        <td className="px-4 py-3 text-right font-semibold">{vit.valor.toFixed(1)} {vit.unidad}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{vit.vdr} {vit.unidad}</td>
                        <td className="px-4 py-3 text-right font-bold">{vit.porcentaje.toFixed(0)}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            vit.porcentaje >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {vit.porcentaje >= 80 ? '✅ OK' : '⚠️ Bajo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800">
                  <strong>💡 Leyenda:</strong> VDR = Valor Diario de Referencia según OMS/FAO para adulto promedio.
                  ✅ OK = 80-120% del VDR | ⚠️ Bajo = &lt;80% | ⚠️ Alto/Exceso = &gt;120% (o &gt;100% para sodio)
                </p>
              </div>
            </div>

            {/* Desglose por día */}
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
      </main>
    </div>
  );
}

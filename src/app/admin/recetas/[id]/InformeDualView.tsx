'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InformeDual } from '@/lib/informe-dual';

const OPCIONES_PORCIONES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const RECOMENDACION_INFO: Record<
  InformeDual['resumen']['recomendacion'],
  { texto: string; clase: string; icono: string }
> = {
  muy_recomendado: { texto: 'Muy recomendado', clase: 'bg-green-100 text-green-800', icono: '🌿' },
  recomendado: { texto: 'Recomendado', clase: 'bg-emerald-100 text-emerald-800', icono: '✅' },
  neutral: { texto: 'Neutral', clase: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200', icono: '➖' },
  mejorar: { texto: 'A mejorar', clase: 'bg-amber-100 text-amber-800', icono: '⚠️' },
  rechazado: { texto: 'No recomendado', clase: 'bg-red-100 text-red-800', icono: '🚫' },
};

const CONFIANZA_CLASE: Record<InformeDual['confianza']['nivel'], string> = {
  alta: 'bg-green-100 text-green-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-red-100 text-red-800',
};

function Acordeon({
  titulo,
  icono,
  defaultOpen = false,
  children,
}: {
  titulo: string;
  icono: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-left"
      >
        <span className="font-semibold">
          {icono} {titulo}
        </span>
        <span className="text-gray-600 dark:text-gray-300">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">{children}</div>}
    </div>
  );
}

function Metrica({ valor, unidad, etiqueta }: { valor: number; unidad: string; etiqueta: string }) {
  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-center">
      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {valor}
        <span className="text-sm font-normal text-gray-600 dark:text-gray-300"> {unidad}</span>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{etiqueta}</div>
    </div>
  );
}

function normalizarClaveNutri(valor: string): string {
  return (valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function evaluarMacro(
  valor: number,
  min: number,
  max: number,
  bajo: string,
  alto: string
): { estado: 'bajo' | 'adecuado' | 'alto'; texto: string; clase: string } {
  if (valor < min) {
    return { estado: 'bajo', texto: bajo, clase: 'bg-amber-50 text-amber-800 border border-amber-200' };
  }
  if (valor > max) {
    return { estado: 'alto', texto: alto, clase: 'bg-red-50 text-red-800 border border-red-200' };
  }
  return {
    estado: 'adecuado',
    texto: 'Aporte en rango recomendado para una comida.',
    clase: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  };
}

export default function InformeDualView({
  recetaId,
  endpoint = '/api/admin/recetas',
  mostrarExport = true,
  porcionesIniciales = 1,
  porcionesFijas = false,
  onPorcionesChange,
}: {
  recetaId: string;
  /** Base del endpoint; se completa como `${endpoint}/${recetaId}/informe`. */
  endpoint?: string;
  /** Muestra los botones de exportación (JSON/HTML). */
  mostrarExport?: boolean;
  /** Porciones iniciales a consultar/renderizar. */
  porcionesIniciales?: number;
  /** Si es true, bloquea el informe a una cantidad fija de porciones. */
  porcionesFijas?: boolean;
  /** Notifica cambios de porciones al componente padre. */
  onPorcionesChange?: (porciones: number) => void;
}) {
  const [porciones, setPorciones] = useState(Math.max(1, porcionesIniciales));
  const [informe, setInforme] = useState<InformeDual | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(
    async (p: number) => {
      setCargando(true);
      setError('');
      try {
        const res = await fetch(`${endpoint}/${recetaId}/informe?porciones=${p}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar el informe');
        setInforme(data.informe);
        if (data.informe?.resumen?.porcionesBase) {
          // Sincroniza el selector con la base la primera vez.
        }
      } catch (e: any) {
        setError(e.message);
        setInforme(null);
      } finally {
        setCargando(false);
      }
    },
    [recetaId, endpoint]
  );

  useEffect(() => {
    setPorciones(Math.max(1, porcionesIniciales));
  }, [porcionesIniciales, recetaId]);

  useEffect(() => {
    cargar(porciones);
  }, [porciones, cargar]);

  useEffect(() => {
    onPorcionesChange?.(porciones);
  }, [porciones, onPorcionesChange]);

  const descargarJson = () => {
    window.open(`${endpoint}/${recetaId}/informe?porciones=${porciones}&descargar=1`, '_blank');
  };
  const abrirImprimible = () => {
    window.open(`${endpoint}/${recetaId}/informe?porciones=${porciones}&formato=html`, '_blank');
  };

  return (
    <section className="mt-8 space-y-4 text-gray-800 dark:text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">🔬 Informe dual (nutrición + Hildegarda)</h2>
        {mostrarExport && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={descargarJson}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-400 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ⬇️ JSON
            </button>
            <button
              type="button"
              onClick={abrirImprimible}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-400 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              🖨️ PDF / HTML
            </button>
          </div>
        )}
      </div>

      {/* Selector de porciones */}
      {porcionesFijas ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="font-semibold">{porciones} porción{porciones === 1 ? '' : 'es'}</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
            Receta base: {informe?.resumen.porcionesBase ?? 4} porciones · Ver para:
          </span>
          {OPCIONES_PORCIONES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPorciones(p)}
              className={`px-3 py-1 rounded-md text-sm border font-medium transition ${
                porciones === p
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-gray-400 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {cargando && <p className="text-sm text-gray-700 dark:text-gray-200">Calculando informe…</p>}
      {error && <p className="text-sm text-red-700 font-medium">{error}</p>}

      {informe && !cargando && (
        <div className="space-y-4">
          {(() => {
            const calorias = evaluarMacro(
              informe.resumen.caloriasPorPorcion,
              450,
              900,
              'Calorías bajas para una comida principal.',
              'Calorías elevadas para una comida principal.'
            );
            const proteinas = evaluarMacro(
              informe.resumen.proteinasPorPorcion,
              25,
              60,
              'Proteínas bajas para objetivo de saciedad.',
              'Proteínas altas para una sola porción.'
            );
            const carbohidratos = evaluarMacro(
              informe.resumen.carbohidratosPorPorcion,
              35,
              95,
              'Carbohidratos bajos para energía principal.',
              'Carbohidratos altos para una sola porción.'
            );

            const clavesEsperadas = [
              'Calcio',
              'Hierro',
              'Magnesio',
              'Potasio',
              'Zinc',
              'Vit. A',
              'Vit. C',
              'Vit. D',
              'Vit. E',
              'Vit. K',
              'Vit. B9',
              'Vit. B12',
            ];
            const destacadosSet = new Set(
              informe.cientifico.micronutrientesDestacados.map((m) => normalizarClaveNutri(m))
            );
            const faltantes = clavesEsperadas.filter(
              (m) => !destacadosSet.has(normalizarClaveNutri(m))
            );

            return (
              <div className="space-y-2">
                <div className={`rounded-lg px-3 py-2 text-sm ${calorias.clase}`}>
                  🔥 <strong>Calorías:</strong> {calorias.texto}
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm ${proteinas.clase}`}>
                  💪 <strong>Proteínas:</strong> {proteinas.texto}
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm ${carbohidratos.clase}`}>
                  🌾 <strong>Carbohidratos:</strong> {carbohidratos.texto}
                </div>
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                  🧪 <strong>Micronutrientes cubiertos:</strong>{' '}
                  {informe.cientifico.micronutrientesDestacados.join(', ') || 'ninguno'}
                  {faltantes.length > 0 ? (
                    <>
                      {' '}
                      · <strong>Faltantes:</strong> {faltantes.slice(0, 6).join(', ')}
                      {faltantes.length > 6 ? ` +${faltantes.length - 6}` : ''}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })()}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                RECOMENDACION_INFO[informe.resumen.recomendacion].clase
              }`}
            >
              {RECOMENDACION_INFO[informe.resumen.recomendacion].icono}{' '}
              {RECOMENDACION_INFO[informe.resumen.recomendacion].texto} ·{' '}
              {informe.resumen.puntajeGlobal}/100
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${CONFIANZA_CLASE[informe.confianza.nivel]}`}>
              Confianza {informe.confianza.nivel} ({informe.confianza.score})
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-lime-100 text-lime-800">
              Viriditas: {informe.resumen.selloViriditas}
            </span>
            {informe.resumen.esAptoParaEnfermos && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-sky-100 text-sky-800">
                Apto para enfermos
              </span>
            )}
            {informe.alergenos.nivelRiesgo !== 'ninguno' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                Alérgenos: {informe.alergenos.nivelRiesgo}
              </span>
            )}
          </div>

          {/* Banner de baja confianza */}
          {informe.confianza.nivel !== 'alta' && informe.confianza.motivos.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-900">⚠️ Confianza {informe.confianza.nivel}</p>
              <ul className="list-disc list-inside text-amber-800 mt-1">
                {informe.confianza.motivos.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumen: métricas por porción */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metrica valor={informe.resumen.caloriasPorPorcion} unidad="kcal" etiqueta="por porción" />
            <Metrica valor={informe.resumen.proteinasPorPorcion} unidad="g" etiqueta="proteínas" />
            <Metrica valor={informe.resumen.carbohidratosPorPorcion} unidad="g" etiqueta="carbohidratos" />
            <Metrica valor={informe.resumen.grasasPorPorcion} unidad="g" etiqueta="grasas" />
          </div>

          {/* Científico */}
          <Acordeon titulo="Detalle científico" icono="🔬">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Totales receta completa</h4>
                <ul className="text-gray-700 dark:text-gray-200 space-y-0.5">
                  <li>Calorías: {informe.cientifico.totalesReceta.calorias} kcal</li>
                  <li>Proteínas: {informe.cientifico.totalesReceta.proteinas_g} g</li>
                  <li>Carbohidratos: {informe.cientifico.totalesReceta.carbohidratos_g} g</li>
                  <li>Grasas: {informe.cientifico.totalesReceta.grasas_g} g</li>
                  <li>Fibra: {informe.cientifico.totalesReceta.fibra_g} g</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Pesos y rendimiento</h4>
                <ul className="text-gray-700 dark:text-gray-200 space-y-0.5">
                  <li>Peso crudo total: {informe.cientifico.pesoCrudoTotal_g} g</li>
                  <li>Peso cocido estimado: {informe.cientifico.pesoCocidoEstimado_g} g</li>
                  <li>Rendimiento promedio: {informe.cientifico.factorRendimientoPromedio}</li>
                  <li>
                    Micronutrientes destacados:{' '}
                    {informe.cientifico.micronutrientesDestacados.join(', ') || '—'}
                  </li>
                </ul>
              </div>
            </div>
          </Acordeon>

          {/* Hildegardiano */}
          <Acordeon titulo="Detalle hildegardiano" icono="🌿">
            <p className="text-sm text-gray-800 dark:text-gray-100 mb-3">
              Temperamento dominante: <strong>{informe.hildegardiano.temperamentoDominante}</strong> · Livor:{' '}
              {informe.hildegardiano.impactoLivor} · Bilis negra: {informe.hildegardiano.impactoBilisNegra}
            </p>
            {informe.hildegardiano.factores.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-1 pr-2">Factor</th>
                    <th className="py-1 pr-2">Puntos</th>
                    <th className="py-1">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {informe.hildegardiano.factores.map((f, idx) => (
                    <tr key={idx} className="border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                      <td className="py-1 pr-2">{f.etiqueta}</td>
                      <td
                        className={`py-1 pr-2 font-semibold ${
                          f.tipo === 'bonificacion' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {f.tipo === 'bonificacion' ? '+' : ''}
                        {f.puntos}
                      </td>
                      <td className="py-1 text-gray-700 dark:text-gray-200">{f.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {informe.hildegardiano.ingredientesDestacados.length > 0 && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Ingredientes destacados</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                  {informe.hildegardiano.ingredientesDestacados.map((d, idx) => (
                    <li key={idx}>
                      <strong>{d.nombre}</strong> ({d.rol.replace(/_/g, ' ')}) — {d.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Acordeon>

          {/* Ingredientes escalados */}
          <Acordeon titulo="Ingredientes escalados" icono="⚖️">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="py-1 pr-2">Ingrediente</th>
                    <th className="py-1 pr-2">Cantidad</th>
                    <th className="py-1 pr-2">Temperamento</th>
                    <th className="py-1 pr-2">Temporada</th>
                    <th className="py-1">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {informe.detalleIngredientes.map((d, idx) => (
                    <tr key={idx} className="border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                      <td className="py-1 pr-2 font-medium">
                        {d.esVeneno && '⚠️ '}
                        {d.esBaseAlegria && '🌿 '}
                        {d.nombre}
                      </td>
                      <td className="py-1 pr-2 whitespace-nowrap">{d.cantidadEscalada}</td>
                      <td className="py-1 pr-2">{d.temperamento}</td>
                      <td className="py-1 pr-2">{d.enTemporada ? '✅' : '—'}</td>
                      <td className="py-1 text-gray-700 dark:text-gray-200">
                        {d.requiereCoccion && !d.estaCocido ? 'Requiere cocción · ' : ''}
                        {d.alternativaSana ? `Alt: ${d.alternativaSana}` : d.frecuenciaRecomendada}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Acordeon>

          {/* Recomendaciones */}
          <Acordeon titulo="Recomendaciones de preparación" icono="📋">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {(
                [
                  ['Preparación', informe.recomendaciones.preparacion],
                  ['Consumo', informe.recomendaciones.consumo],
                  ['Maridaje', informe.recomendaciones.maridaje],
                  ['Contraindicaciones', informe.recomendaciones.contraindicaciones],
                ] as const
              ).map(([titulo, items]) =>
                items.length > 0 ? (
                  <div key={titulo}>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{titulo}</h4>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-200 space-y-0.5">
                      {items.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
            {informe.advertenciasCoccion.length > 0 && (
              <div className="mt-3 text-sm text-amber-800">
                <h4 className="font-semibold">Advertencias de cocción</h4>
                <ul className="list-disc list-inside">
                  {informe.advertenciasCoccion.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Maridaje hildegardiano</h4>
              <p>
                🍷 {informe.maridajeHildegardiano.bebidaRecomendada} · 🌶️{' '}
                {informe.maridajeHildegardiano.especiasSugeridas.join(', ')} · 🍪{' '}
                {informe.maridajeHildegardiano.postreIdeal}
              </p>
            </div>
          </Acordeon>

          {/* Estacionalidad */}
          <Acordeon titulo="Estacionalidad" icono="🍂">
            <p className="text-sm text-gray-800 dark:text-gray-100">
              Estación actual: <strong>{informe.estacionalidad.estacionActual}</strong> ·{' '}
              {informe.estacionalidad.porcentajeTemporada}% de ingredientes en temporada
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm mt-2">
              <div>
                <h4 className="font-semibold mb-1 text-green-700">En temporada</h4>
                <p className="text-gray-700 dark:text-gray-200">
                  {informe.estacionalidad.ingredientesEnTemporada.join(', ') || '—'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-amber-700">Fuera de temporada</h4>
                <p className="text-gray-700 dark:text-gray-200">
                  {informe.estacionalidad.ingredientesFueraTemporada.join(', ') || '—'}
                </p>
              </div>
            </div>
          </Acordeon>
        </div>
      )}
    </section>
  );
}

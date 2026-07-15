'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InformeDual } from '@/lib/informe-dual';

const OPCIONES_PORCIONES = [1, 2, 4, 6, 8, 10];

const RECOMENDACION_INFO: Record<
  InformeDual['resumen']['recomendacion'],
  { texto: string; clase: string; icono: string }
> = {
  muy_recomendado: { texto: 'Muy recomendado', clase: 'bg-green-100 text-green-800', icono: '🌿' },
  recomendado: { texto: 'Recomendado', clase: 'bg-emerald-100 text-emerald-800', icono: '✅' },
  neutral: { texto: 'Neutral', clase: 'bg-gray-100 text-gray-700', icono: '➖' },
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
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 text-left"
      >
        <span className="font-semibold">
          {icono} {titulo}
        </span>
        <span className="text-gray-600">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-3 bg-white text-gray-800">{children}</div>}
    </div>
  );
}

function Metrica({ valor, unidad, etiqueta }: { valor: number; unidad: string; etiqueta: string }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-3 text-center">
      <div className="text-xl font-bold text-gray-900">
        {valor}
        <span className="text-sm font-normal text-gray-600"> {unidad}</span>
      </div>
      <div className="text-xs text-gray-600 mt-1">{etiqueta}</div>
    </div>
  );
}

export default function InformeDualView({
  recetaId,
  endpoint = '/api/admin/recetas',
  mostrarExport = true,
}: {
  recetaId: string;
  /** Base del endpoint; se completa como `${endpoint}/${recetaId}/informe`. */
  endpoint?: string;
  /** Muestra los botones de exportación (JSON/HTML). */
  mostrarExport?: boolean;
}) {
  const [porciones, setPorciones] = useState(4);
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
    cargar(porciones);
  }, [porciones, cargar]);

  const descargarJson = () => {
    window.open(`${endpoint}/${recetaId}/informe?porciones=${porciones}&descargar=1`, '_blank');
  };
  const abrirImprimible = () => {
    window.open(`${endpoint}/${recetaId}/informe?porciones=${porciones}&formato=html`, '_blank');
  };

  return (
    <section className="mt-8 space-y-4 text-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">🔬 Informe dual (nutrición + Hildegarda)</h2>
        {mostrarExport && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={descargarJson}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-400 text-gray-800 hover:bg-gray-100"
            >
              ⬇️ JSON
            </button>
            <button
              type="button"
              onClick={abrirImprimible}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-400 text-gray-800 hover:bg-gray-100"
            >
              🖨️ PDF / HTML
            </button>
          </div>
        )}
      </div>

      {/* Selector de porciones */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-700 font-medium">
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
                : 'border-gray-400 text-gray-800 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {cargando && <p className="text-sm text-gray-700">Calculando informe…</p>}
      {error && <p className="text-sm text-red-700 font-medium">{error}</p>}

      {informe && !cargando && (
        <div className="space-y-4">
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
                <h4 className="font-semibold text-gray-900 mb-1">Totales receta completa</h4>
                <ul className="text-gray-700 space-y-0.5">
                  <li>Calorías: {informe.cientifico.totalesReceta.calorias} kcal</li>
                  <li>Proteínas: {informe.cientifico.totalesReceta.proteinas_g} g</li>
                  <li>Carbohidratos: {informe.cientifico.totalesReceta.carbohidratos_g} g</li>
                  <li>Grasas: {informe.cientifico.totalesReceta.grasas_g} g</li>
                  <li>Fibra: {informe.cientifico.totalesReceta.fibra_g} g</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Pesos y rendimiento</h4>
                <ul className="text-gray-700 space-y-0.5">
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
            <p className="text-sm text-gray-800 mb-3">
              Temperamento dominante: <strong>{informe.hildegardiano.temperamentoDominante}</strong> · Livor:{' '}
              {informe.hildegardiano.impactoLivor} · Bilis negra: {informe.hildegardiano.impactoBilisNegra}
            </p>
            {informe.hildegardiano.factores.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-1 pr-2">Factor</th>
                    <th className="py-1 pr-2">Puntos</th>
                    <th className="py-1">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {informe.hildegardiano.factores.map((f, idx) => (
                    <tr key={idx} className="border-t border-gray-200 text-gray-800">
                      <td className="py-1 pr-2">{f.etiqueta}</td>
                      <td
                        className={`py-1 pr-2 font-semibold ${
                          f.tipo === 'bonificacion' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {f.tipo === 'bonificacion' ? '+' : ''}
                        {f.puntos}
                      </td>
                      <td className="py-1 text-gray-700">{f.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {informe.hildegardiano.ingredientesDestacados.length > 0 && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Ingredientes destacados</h4>
                <ul className="text-sm text-gray-700 space-y-1">
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
                  <tr className="text-left text-gray-600">
                    <th className="py-1 pr-2">Ingrediente</th>
                    <th className="py-1 pr-2">Cantidad</th>
                    <th className="py-1 pr-2">Temperamento</th>
                    <th className="py-1 pr-2">Temporada</th>
                    <th className="py-1">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {informe.detalleIngredientes.map((d, idx) => (
                    <tr key={idx} className="border-t border-gray-200 text-gray-800">
                      <td className="py-1 pr-2 font-medium">
                        {d.esVeneno && '⚠️ '}
                        {d.esBaseAlegria && '🌿 '}
                        {d.nombre}
                      </td>
                      <td className="py-1 pr-2 whitespace-nowrap">{d.cantidadEscalada}</td>
                      <td className="py-1 pr-2">{d.temperamento}</td>
                      <td className="py-1 pr-2">{d.enTemporada ? '✅' : '—'}</td>
                      <td className="py-1 text-gray-700">
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
                    <h4 className="font-semibold text-gray-900 mb-1">{titulo}</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-0.5">
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
            <div className="mt-3 text-sm text-gray-700">
              <h4 className="font-semibold text-gray-900">Maridaje hildegardiano</h4>
              <p>
                🍷 {informe.maridajeHildegardiano.bebidaRecomendada} · 🌶️{' '}
                {informe.maridajeHildegardiano.especiasSugeridas.join(', ')} · 🍪{' '}
                {informe.maridajeHildegardiano.postreIdeal}
              </p>
            </div>
          </Acordeon>

          {/* Estacionalidad */}
          <Acordeon titulo="Estacionalidad" icono="🍂">
            <p className="text-sm text-gray-800">
              Estación actual: <strong>{informe.estacionalidad.estacionActual}</strong> ·{' '}
              {informe.estacionalidad.porcentajeTemporada}% de ingredientes en temporada
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm mt-2">
              <div>
                <h4 className="font-semibold mb-1 text-green-700">En temporada</h4>
                <p className="text-gray-700">
                  {informe.estacionalidad.ingredientesEnTemporada.join(', ') || '—'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-amber-700">Fuera de temporada</h4>
                <p className="text-gray-700">
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

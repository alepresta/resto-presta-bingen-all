'use client';

import { useState } from 'react';
import type { AnalisisPlato, ResumenLinea } from '@/lib/analisis-plato';
import InformeDualView from '@/app/admin/recetas/[id]/InformeDualView';
import { escalarIngrediente } from '@/lib/escalado';

// Convierte un paso de receta (string u objeto {descripcion/texto/paso/...}) en texto legible
function textoDePaso(p: any): string {
  if (typeof p === 'string') return p;
  if (!p || typeof p !== 'object') return String(p ?? '');
  return p.descripcion || p.texto || p.paso_texto || (typeof p.paso === 'string' ? p.paso : '') || '';
}

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
  porciones_base?: number | null;
  dificultad: string;
  notas_hildegardianas: string;
  interpretacion_hildegardiana?: string | null;
}

interface Plato {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number | null;
  imagen?: string | null;
  alergenos: string[];
  tags: string[];
  es_estrella: boolean;
  dia_semana_id: number | null;
  disponible_todos_dias: boolean;
  categoria_id: number;
  receta: Receta | null;
  analisis?: AnalisisPlato | null;
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

const TONO_CLASE: Record<ResumenLinea['tono'], string> = {
  malo: 'text-red-700',
  alerta: 'text-amber-700',
  bien: 'text-green-700',
  neutro: 'text-gray-500',
};

function ResumenPlato({ resumen }: { resumen: ResumenLinea[] }) {
  if (!resumen || resumen.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
      {resumen.map((linea, i) => (
        <div key={i}>
          <p className={`text-xs font-semibold flex items-center gap-1.5 ${TONO_CLASE[linea.tono]}`}>
            <span>{linea.icono}</span>
            <span>{linea.texto}</span>
          </p>
          {linea.detalle && linea.detalle.length > 0 && (
            <ul className="mt-0.5 ml-6 flex flex-wrap gap-x-2 gap-y-0.5">
              {linea.detalle.map((d, j) => (
                <li
                  key={j}
                  className="text-[10px] leading-tight text-gray-500 before:content-['•'] before:mr-1 before:text-gray-300"
                >
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

const MACROS_MODAL: Array<{ clave: string; label: string; unidad: string }> = [
  { clave: 'calorias', label: 'Calorías', unidad: 'kcal' },
  { clave: 'proteinas', label: 'Proteínas', unidad: 'g' },
  { clave: 'carbohidratos', label: 'Carbohidratos', unidad: 'g' },
  { clave: 'grasas', label: 'Grasas', unidad: 'g' },
  { clave: 'grasas_saturadas', label: 'Grasas saturadas', unidad: 'g' },
  { clave: 'fibra', label: 'Fibra', unidad: 'g' },
  { clave: 'azucar', label: 'Azúcar', unidad: 'g' },
  { clave: 'sodio', label: 'Sodio', unidad: 'mg' },
];

const MICROS_MODAL: Array<{ clave: string; label: string; unidad: string }> = [
  { clave: 'calcio', label: 'Calcio', unidad: 'mg' },
  { clave: 'hierro', label: 'Hierro', unidad: 'mg' },
  { clave: 'magnesio', label: 'Magnesio', unidad: 'mg' },
  { clave: 'potasio', label: 'Potasio', unidad: 'mg' },
  { clave: 'zinc', label: 'Zinc', unidad: 'mg' },
  { clave: 'fosforo', label: 'Fósforo', unidad: 'mg' },
  { clave: 'vitaminaA', label: 'Vit. A', unidad: 'µg' },
  { clave: 'vitaminaC', label: 'Vit. C', unidad: 'mg' },
  { clave: 'vitaminaD', label: 'Vit. D', unidad: 'µg' },
  { clave: 'vitaminaE', label: 'Vit. E', unidad: 'mg' },
  { clave: 'vitaminaK', label: 'Vit. K', unidad: 'µg' },
  { clave: 'vitaminaB1', label: 'Vit. B1', unidad: 'mg' },
  { clave: 'vitaminaB2', label: 'Vit. B2', unidad: 'mg' },
  { clave: 'vitaminaB3', label: 'Vit. B3', unidad: 'mg' },
  { clave: 'vitaminaB5', label: 'Vit. B5', unidad: 'mg' },
  { clave: 'vitaminaB6', label: 'Vit. B6', unidad: 'mg' },
  { clave: 'vitaminaB9', label: 'Vit. B9', unidad: 'µg' },
  { clave: 'vitaminaB12', label: 'Vit. B12', unidad: 'µg' },
];

function fmt(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(n < 1 ? 2 : 1);
}

function ingredientesEscalados(
  receta: Receta,
  porcionesObjetivo: number
): Array<Ingrediente & { textoCantidad: string }> {
  const porcionesBase = receta.porciones_base && receta.porciones_base > 0
    ? receta.porciones_base
    : receta.porciones && receta.porciones > 0
      ? receta.porciones
      : 1;

  return receta.ingredientes.map((ing) => {
    const escalado = escalarIngrediente({
      cantidadBase: Number(ing.cantidad) || 0,
      unidad: ing.unidad || '',
      porcionesObjetivo,
      porcionesBase,
    });

    return {
      ...ing,
      cantidad: escalado.cantidadMostrada,
      textoCantidad: escalado.textoMostrado,
    };
  });
}

function DatosCientificos({ analisis }: { analisis: AnalisisPlato }) {
  if (!analisis.tieneDatos) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm text-gray-500">
        ℹ️ Esta receta aún no tiene datos nutricionales cargados en sus ingredientes.
      </div>
    );
  }
  const { nutricion, porcentajeVDR } = analisis;
  return (
    <div>
      {analisis.bajaConfianza ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Este análisis es aproximado: la receta declarada no cuadra con el peso total cargado.
        </div>
      ) : null}
      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        🔬 Datos nutricionales (por porción)
      </h3>
      {analisis.porcionesEstimadas && analisis.pesoTotalGramos ? (
        <p className="text-xs text-gray-500 mb-3">
          Ingredientes totales: {(analisis.pesoTotalGramos / 1000).toFixed(2)} kg · cocido estimado:{' '}
          {analisis.pesoCocidoEstimadoGramos ? `${(analisis.pesoCocidoEstimadoGramos / 1000).toFixed(2)} kg` : 'n/d'} ·{' '}
          {analisis.porcionesEstimadas}{' '}
          {analisis.porcionesEstimadas === 1 ? 'porción' : 'porciones'} (~
          {analisis.pesoCocidoEstimadoGramos
            ? Math.round(analisis.pesoCocidoEstimadoGramos / analisis.porcionesEstimadas)
            : Math.round(analisis.pesoTotalGramos / analisis.porcionesEstimadas)} g cocidos por porción).
        </p>
      ) : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {MACROS_MODAL.map((m) => (
          <div key={m.clave} className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="text-base font-bold text-purple-700">
              {fmt(nutricion[m.clave as keyof typeof nutricion])}
              <span className="text-xs font-normal text-gray-500"> {m.unidad}</span>
            </p>
            <p className="text-[10px] text-gray-400">{Math.round(porcentajeVDR[m.clave] || 0)}% VDR</p>
          </div>
        ))}
      </div>
      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-purple-700 hover:underline">
          Ver vitaminas y minerales
        </summary>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {MICROS_MODAL.map((m) => {
            const pct = Math.round(porcentajeVDR[m.clave] || 0);
            const bajo = pct < 15;
            return (
              <div key={m.clave} className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className="text-sm font-semibold text-gray-700">
                  {fmt(nutricion[m.clave as keyof typeof nutricion])}
                  <span className="text-[10px] font-normal text-gray-400"> {m.unidad}</span>
                </p>
                <p className={`text-[10px] ${bajo ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                  {pct}% VDR{bajo ? ' · bajo' : ''}
                </p>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function DatosHildegardianos({ analisis }: { analisis: AnalisisPlato }) {
  const h = analisis.hildegardiano;
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-l-4 border-emerald-600 p-4 rounded">
      <h3 className="text-lg font-bold text-emerald-800 mb-2 flex items-center gap-2">
        🌿 Análisis hildegardiano
      </h3>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl font-bold text-emerald-700">{h.puntaje}</span>
        <span className="text-sm text-gray-600">/100 · {h.veredicto}</span>
      </div>
      {h.pilares.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-emerald-800">✨ Pilares de vigor:</p>
          <ul className="text-sm text-gray-700 list-disc pl-5">
            {h.pilares.map((p, i) => (
              <li key={i}><strong>{p.nombre}</strong>: {p.razon}</li>
            ))}
          </ul>
        </div>
      )}
      {h.venenos.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-red-700">🚫 Venenos de cocina:</p>
          <ul className="text-sm text-gray-700 list-disc pl-5">
            {h.venenos.map((v, i) => (
              <li key={i}><strong>{v.nombre}</strong>: {v.razon}</li>
            ))}
          </ul>
        </div>
      )}
      {h.precauciones.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-amber-700">⚠️ Precauciones:</p>
          <ul className="text-sm text-gray-700 list-disc pl-5">
            {h.precauciones.map((p, i) => (
              <li key={i}><strong>{p.nombre}</strong>: {p.motivo}</li>
            ))}
          </ul>
        </div>
      )}
      {h.recomendaciones.length > 0 && (
        <div className="mt-2 space-y-1">
          {h.recomendaciones.map((r, i) => (
            <p key={i} className="text-sm text-gray-700">{r}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaPlato({ plato, onSelect }: { plato: Plato; onSelect: (p: Plato) => void }) {
  return (
    <div
      onClick={() => plato.receta && onSelect(plato)}
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-col ${
        plato.receta ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      {/* Foto */}
      <div className="relative h-40 w-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center overflow-hidden">
        {plato.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plato.imagen} alt={plato.nombre} className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl opacity-60">🍽️</span>
        )}
        {plato.es_estrella && (
          <span className="absolute top-2 left-2 bg-white/90 text-amber-700 text-xs font-bold px-2 py-1 rounded-full shadow">
            ⭐ Especialidad
          </span>
        )}
        <span className="absolute top-2 right-2 bg-amber-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow">
          {plato.precio != null && plato.precio > 0 ? `$ ${plato.precio.toLocaleString('es-AR')}` : 'Gratis'}
        </span>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold text-gray-800">{plato.nombre}</h3>
          {plato.receta && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
              📖 Receta
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm mt-1">{plato.descripcion}</p>

        {plato.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {plato.tags.map((tag) => (
              <span key={tag} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
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

        <div className="flex-1" />

        {/* Resumen nutricional al pie */}
        {plato.analisis && <ResumenPlato resumen={plato.analisis.resumen} />}

        {plato.receta && (
          <p className="text-xs text-amber-700 font-semibold mt-3">
            👆 Click para ver receta y análisis completo
          </p>
        )}
      </div>
    </div>
  );
}

export default function MenuVisual({ restaurante, diaInfo, categorias, todosLosPlatos }: MenuVisualProps) {
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Plato | null>(null);
  const [porcionesModal, setPorcionesModal] = useState(1);
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

  const seleccionarPlato = (plato: Plato) => {
    setPorcionesModal(1);
    setPlatoSeleccionado(plato);
  };

  const ingredientesModal = platoSeleccionado?.receta
    ? ingredientesEscalados(platoSeleccionado.receta, porcionesModal)
    : [];

  const porcionesBaseModal = platoSeleccionado?.receta?.porciones_base && platoSeleccionado.receta.porciones_base > 0
    ? platoSeleccionado.receta.porciones_base
    : platoSeleccionado?.receta?.porciones || 1;

  return (
    <>
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
                  <TarjetaPlato key={plato.id} plato={plato} onSelect={seleccionarPlato} />
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
                    <TarjetaPlato key={plato.id} plato={plato} onSelect={seleccionarPlato} />
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
                <span>
                  👥 {porcionesModal} porción{porcionesModal === 1 ? '' : 'es'}
                  {porcionesBaseModal !== porcionesModal ? (
                    <span className="text-amber-100"> · receta base {porcionesBaseModal}</span>
                  ) : null}
                </span>
                <span>📊 {platoSeleccionado.receta.dificultad}</span>
              </div>
            </div>

            {/* Foto del plato */}
            {platoSeleccionado.imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={platoSeleccionado.imagen}
                alt={platoSeleccionado.nombre}
                className="w-full h-56 object-cover"
              />
            )}

            <div className="p-6 space-y-6">
              {/* Informe dual completo (científico + hildegardiano, escalable por porciones).
                  Es el bloque principal del modal según el plan. */}
              {platoSeleccionado.receta?.id ? (
                <InformeDualView
                  recetaId={platoSeleccionado.receta.id}
                  endpoint="/api/menu/receta"
                  mostrarExport={false}
                  porcionesIniciales={1}
                  onPorcionesChange={setPorcionesModal}
                />
              ) : (
                <>
                  {platoSeleccionado.analisis && (
                    <DatosCientificos analisis={platoSeleccionado.analisis} />
                  )}
                  {platoSeleccionado.analisis && (
                    <DatosHildegardianos analisis={platoSeleccionado.analisis} />
                  )}
                </>
              )}

              {/* Ingredientes */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  🥕 Ingredientes (para {porcionesModal} persona{porcionesModal === 1 ? '' : 's'})
                </h3>
                <ul className="space-y-2">
                  {ingredientesModal.map((ing, i) => (
                    <li key={i} className="flex justify-between items-center bg-amber-50 p-2 rounded">
                      <span className="font-medium text-gray-700">{ing.nombre}</span>
                      <span className="text-amber-700 font-semibold">
                        {ing.textoCantidad}
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
                      <p className="text-gray-700 pt-1">{textoDePaso(paso)}</p>
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

              {/* Interpretación Hildegardiana (informe editorial) */}
              {platoSeleccionado.receta.interpretacion_hildegardiana && (
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-l-4 border-emerald-600 p-4 rounded">
                  <h3 className="text-lg font-bold text-emerald-800 mb-2 flex items-center gap-2">
                    🌿 Informe Hildegardiano
                  </h3>
                  <p className="text-gray-700 whitespace-pre-line">
                    {platoSeleccionado.receta.interpretacion_hildegardiana}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

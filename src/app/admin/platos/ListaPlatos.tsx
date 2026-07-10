'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ToggleTema from '@/components/ToggleTema';
import type { AnalisisPlato } from '@/lib/analisis-plato';

interface Ingrediente {
  id: string;
  nombre: string;
  temperamento: string | null;
  es_veneno_hildegardiano: boolean;
  es_base_alegria: boolean;
}

interface Plato {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number | null;
  categoria_id: number;
  disponible: boolean;
  imagen: string | null;
  dia_semana_id: number | null;
  disponible_todos_dias?: boolean;
  alergenos?: string[] | null;
  analisis?: AnalisisPlato | null;
  indiceGlucemico?: number | null;
  receta?: {
    id: string;
    ingredientes?: Array<{
      ingrediente: Ingrediente;
    }>;
  } | null;
}

interface ListaPlatosProps {
  platos: Plato[];
}

const CATEGORIAS: Record<number, { nombre: string; icono: string }> = {
  1: { nombre: 'Desayuno', icono: '☕' },
  2: { nombre: 'Plato Principal', icono: '🍽️' },
  3: { nombre: 'Guarnición', icono: '🥗' },
  4: { nombre: 'Bebida', icono: '🥤' },
  5: { nombre: 'Postre', icono: '🍰' },
};

const DIAS_SEMANA: Array<{ id: number; nombre: string; icono: string }> = [
  { id: 1, nombre: 'Lunes', icono: '🥩' },
  { id: 2, nombre: 'Martes', icono: '🥗' },
  { id: 3, nombre: 'Miércoles', icono: '🍝' },
  { id: 4, nombre: 'Jueves', icono: '🍗' },
  { id: 5, nombre: 'Viernes', icono: '🐟' },
  { id: 6, nombre: 'Sábado', icono: '🍕' },
  { id: 7, nombre: 'Domingo', icono: '🍝' },
];

function nombreDia(id: number | null): string {
  if (id === null) return 'Todos los días';
  return DIAS_SEMANA.find((d) => d.id === id)?.nombre ?? 'Todos los días';
}

function formatoPrecio(precio: number | null): string {
  if (precio === null || precio === undefined || precio <= 0) return 'Gratis';
  return `$${precio.toLocaleString('es-AR')}`;
}

// Umbral de "buena fuente": aporta al menos este % del Valor Diario de Referencia
const UMBRAL_FUENTE = 15;

const VITAMINAS: Array<{ clave: string; label: string }> = [
  { clave: 'vitaminaA', label: 'Vit. A' },
  { clave: 'vitaminaC', label: 'Vit. C' },
  { clave: 'vitaminaD', label: 'Vit. D' },
  { clave: 'vitaminaE', label: 'Vit. E' },
  { clave: 'vitaminaK', label: 'Vit. K' },
  { clave: 'vitaminaB1', label: 'Vit. B1' },
  { clave: 'vitaminaB2', label: 'Vit. B2' },
  { clave: 'vitaminaB3', label: 'Vit. B3' },
  { clave: 'vitaminaB5', label: 'Vit. B5' },
  { clave: 'vitaminaB6', label: 'Vit. B6' },
  { clave: 'vitaminaB9', label: 'Vit. B9' },
  { clave: 'vitaminaB12', label: 'Vit. B12' },
];

const MINERALES: Array<{ clave: string; label: string }> = [
  { clave: 'calcio', label: 'Calcio' },
  { clave: 'hierro', label: 'Hierro' },
  { clave: 'magnesio', label: 'Magnesio' },
  { clave: 'potasio', label: 'Potasio' },
  { clave: 'zinc', label: 'Zinc' },
  { clave: 'fosforo', label: 'Fósforo' },
];

function tieneGluten(plato: Plato): boolean {
  return (plato.alergenos || []).some((a) => /gluten|trigo|cebada|centeno|avena|espelta/i.test(a));
}

// Clasificación del índice glucémico: bajo ≤ 55, medio 56-69, alto ≥ 70
function categoriaIG(ig: number | null | undefined): 'bajo' | 'medio' | 'alto' | null {
  if (ig === null || ig === undefined) return null;
  if (ig <= 55) return 'bajo';
  if (ig <= 69) return 'medio';
  return 'alto';
}

const IG_INFO: Record<'bajo' | 'medio' | 'alto', { label: string; color: string }> = {
  bajo: { label: 'IG bajo', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  medio: { label: 'IG medio', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  alto: { label: 'IG alto', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

function ModalEditarPlato({
  plato,
  guardando,
  error,
  onGuardar,
  onCerrar,
}: {
  plato: Plato;
  guardando: boolean;
  error: string | null;
  onGuardar: (
    id: string,
    cambios: { imagen: string | null; precio: number | null; disponible: boolean; dia_semana_id: number | null }
  ) => void;
  onCerrar: () => void;
}) {
  const [imagen, setImagen] = useState(plato.imagen ?? '');
  const [precio, setPrecio] = useState(
    plato.precio === null || plato.precio === undefined || plato.precio <= 0 ? '' : String(plato.precio)
  );
  const [disponible, setDisponible] = useState(plato.disponible);
  const [diaSemana, setDiaSemana] = useState<string>(
    plato.dia_semana_id === null || plato.dia_semana_id === undefined ? '' : String(plato.dia_semana_id)
  );
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  const subirImagen = async (file: File) => {
    setSubiendo(true);
    setErrorImagen(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/platos/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la imagen');
      setImagen(data.url);
    } catch (e: any) {
      setErrorImagen(e.message || 'Error al subir la imagen');
    } finally {
      setSubiendo(false);
    }
  };

  const sinPrecio = precio.trim() === '';
  const precioNum = Number(precio);
  const precioValido = sinPrecio || (Number.isFinite(precioNum) && precioNum >= 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">✏️ Editar plato</h3>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ✖️
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{plato.nombre}</p>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🖼️ Imagen
            </label>

            {/* Subir desde la PC */}
            <label className={`flex items-center justify-center gap-2 w-full px-3 py-3 mb-2 border-2 border-dashed rounded-lg cursor-pointer text-sm font-semibold transition-colors ${
              subiendo
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={subiendo}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) subirImagen(f);
                  e.currentTarget.value = '';
                }}
              />
              {subiendo ? '⏳ Subiendo…' : '📁 Subir desde mi PC'}
            </label>

            {/* O pegar URL */}
            <input
              type="url"
              value={imagen}
              onChange={(e) => setImagen(e.target.value)}
              placeholder="…o pegá una URL: https://…/foto.jpg"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            {errorImagen && (
              <p className="mt-1 text-xs text-red-600">❌ {errorImagen}</p>
            )}

            {imagen ? (
              <div className="mt-2 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagen}
                  alt="Vista previa"
                  className="h-32 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setImagen('')}
                  className="absolute top-1 right-1 bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 rounded-full w-6 h-6 text-xs font-bold shadow hover:bg-red-100 hover:text-red-600"
                  title="Quitar imagen"
                >
                  ✖️
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400">Sin imagen. Subí una foto o pegá una URL.</p>
            )}
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              💲 Precio <span className="font-normal text-gray-400">(dejar vacío = Gratis)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step="1"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Gratis"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {!sinPrecio && (
                <button
                  type="button"
                  onClick={() => setPrecio('')}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
                >
                  Gratis
                </button>
              )}
            </div>
            {sinPrecio ? (
              <p className="mt-1 text-xs text-gray-400">Este plato se mostrará como <strong>Gratis</strong>.</p>
            ) : !precioValido ? (
              <p className="mt-1 text-xs text-red-600">Ingresá un precio válido (≥ 0) o dejalo vacío.</p>
            ) : null}
          </div>

          {/* Día de la semana */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              📅 Día de disponibilidad
            </label>
            <select
              value={diaSemana}
              onChange={(e) => setDiaSemana(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">🗓️ Todos los días</option>
              {DIAS_SEMANA.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icono} {d.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Publicación */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              👁️ Estado en el menú
            </label>
            <label className="flex items-center gap-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700">
              <input
                type="checkbox"
                checked={disponible}
                onChange={(e) => setDisponible(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                {disponible ? '🟢 Publicado (visible en el menú)' : '⚪ No publicado (oculto)'}
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm">
              ❌ {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onGuardar(plato.id, {
                imagen: imagen.trim() || null,
                precio: sinPrecio ? 0 : precioNum,
                disponible,
                dia_semana_id: diaSemana === '' ? null : Number(diaSemana),
              })
            }
            disabled={guardando || !precioValido || subiendo}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TEMPERAMENTOS = [
  { valor: 'calido', nombre: '🌡️ Cálido', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  { valor: 'calido_seco', nombre: '🔥 Cálido-Seco', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  { valor: 'calido_humedo', nombre: '🌊 Cálido-Húmedo', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { valor: 'frio', nombre: '❄️ Frío', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { valor: 'frio_seco', nombre: '🍃 Frío-Seco', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  { valor: 'frio_humedo', nombre: '💧 Frío-Húmedo', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
];

export default function ListaPlatos({ platos }: ListaPlatosProps) {
  const router = useRouter();
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [temperamentoFiltro, setTemperamentoFiltro] = useState<string>('');
  const [soloSinVenenos, setSoloSinVenenos] = useState(false);
  const [soloBaseAlegria, setSoloBaseAlegria] = useState(false);
  const [vista, setVista] = useState<'grid' | 'lista'>('grid');

  // Filtros avanzados
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'publicados' | 'despublicados'>('todos');
  const [precioFiltro, setPrecioFiltro] = useState<'todos' | 'gratis' | 'con_precio'>('todos');
  const [glutenFiltro, setGlutenFiltro] = useState<'todos' | 'con' | 'sin'>('todos');
  const [igFiltro, setIgFiltro] = useState<'todos' | 'bajo' | 'medio' | 'alto'>('todos');
  const [vitaminasSel, setVitaminasSel] = useState<string[]>([]);
  const [mineralesSel, setMineralesSel] = useState<string[]>([]);
  const [panelNutrientes, setPanelNutrientes] = useState(false);

  const toggleEnLista = (
    valor: string,
    lista: string[],
    setter: (v: string[]) => void
  ) => {
    setter(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  };


  // Edición de plato
  const [platoEditando, setPlatoEditando] = useState<Plato | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const guardarPlato = async (
    id: string,
    cambios: { imagen?: string | null; precio?: number | null; disponible?: boolean; dia_semana_id?: number | null }
  ) => {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const res = await fetch(`/api/admin/platos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setPlatoEditando(null);
      router.refresh();
    } catch (e: any) {
      setErrorGuardar(e.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const togglePublicado = async (plato: Plato) => {
    setGuardando(true);
    try {
      await fetch(`/api/admin/platos/${plato.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponible: !plato.disponible }),
      });
      router.refresh();
    } finally {
      setGuardando(false);
    }
  };


  const platosFiltrados = useMemo(() => {
    return platos.filter((plato) => {
      if (textoBusqueda) {
        const texto = textoBusqueda.toLowerCase();
        const coincideNombre = plato.nombre.toLowerCase().includes(texto);
        const coincideDesc = plato.descripcion?.toLowerCase().includes(texto) || false;
        const coincideIngrediente = plato.receta?.ingredientes?.some(ri =>
          ri.ingrediente.nombre.toLowerCase().includes(texto)
        ) || false;
        if (!coincideNombre && !coincideDesc && !coincideIngrediente) return false;
      }

      // Estado de publicación
      if (estadoFiltro === 'publicados' && !plato.disponible) return false;
      if (estadoFiltro === 'despublicados' && plato.disponible) return false;

      // Precio
      const esGratis = plato.precio === null || plato.precio === undefined || plato.precio <= 0;
      if (precioFiltro === 'gratis' && !esGratis) return false;
      if (precioFiltro === 'con_precio' && esGratis) return false;

      // Gluten (según alérgenos declarados)
      if (glutenFiltro === 'con' && !tieneGluten(plato)) return false;
      if (glutenFiltro === 'sin' && tieneGluten(plato)) return false;

      // Índice glucémico
      if (igFiltro !== 'todos' && categoriaIG(plato.indiceGlucemico) !== igFiltro) return false;

      if (categoriaFiltro && plato.categoria_id !== categoriaFiltro) return false;

      if (temperamentoFiltro && plato.receta?.ingredientes) {
        const tieneTemperamento = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.temperamento === temperamentoFiltro
        );
        if (!tieneTemperamento) return false;
      } else if (temperamentoFiltro) {
        return false;
      }

      if (soloSinVenenos && plato.receta?.ingredientes) {
        const tieneVeneno = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.es_veneno_hildegardiano
        );
        if (tieneVeneno) return false;
      }

      if (soloBaseAlegria && plato.receta?.ingredientes) {
        const tieneBase = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.es_base_alegria
        );
        if (!tieneBase) return false;
      } else if (soloBaseAlegria) {
        return false;
      }

      // Vitaminas / minerales: el plato debe ser buena fuente (≥ UMBRAL_FUENTE % VDR) de cada uno elegido
      if (vitaminasSel.length > 0 || mineralesSel.length > 0) {
        const pct = plato.analisis?.porcentajeVDR;
        if (!pct) return false;
        for (const clave of vitaminasSel) {
          if ((pct[clave] || 0) < UMBRAL_FUENTE) return false;
        }
        for (const clave of mineralesSel) {
          if ((pct[clave] || 0) < UMBRAL_FUENTE) return false;
        }
      }

      return true;
    });
  }, [platos, textoBusqueda, categoriaFiltro, temperamentoFiltro, soloSinVenenos, soloBaseAlegria, estadoFiltro, precioFiltro, glutenFiltro, igFiltro, vitaminasSel, mineralesSel]);


  const totalConReceta = platos.filter(p => p.receta?.id).length;
  const totalPublicados = platos.filter(p => p.disponible).length;
  const totalDespublicados = platos.length - totalPublicados;

  const limpiarFiltros = () => {
    setTextoBusqueda('');
    setCategoriaFiltro(null);
    setTemperamentoFiltro('');
    setSoloSinVenenos(false);
    setSoloBaseAlegria(false);
    setEstadoFiltro('todos');
    setPrecioFiltro('todos');
    setGlutenFiltro('todos');
    setIgFiltro('todos');
    setVitaminasSel([]);
    setMineralesSel([]);
  };

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos || soloBaseAlegria
    || estadoFiltro !== 'todos' || precioFiltro !== 'todos' || glutenFiltro !== 'todos' || igFiltro !== 'todos'
    || vitaminasSel.length > 0 || mineralesSel.length > 0;

  const getTemperamentoDominante = (plato: Plato): string | null => {
    if (!plato.receta?.ingredientes) return null;
    const temps: Record<string, number> = {};
    plato.receta.ingredientes.forEach(ri => {
      const t = ri.ingrediente.temperamento;
      if (t) temps[t] = (temps[t] || 0) + 1;
    });
    const entries = Object.entries(temps);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🍽️ Gestión de Platos</h1>
            <p className="text-amber-100 text-sm">
              {platos.length} platos · {totalPublicados} publicados · {totalDespublicados} ocultos · {totalConReceta} con receta
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <ToggleTema />
            <Link
              href="/admin"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              ← Panel
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Buscador */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🔍 Buscar y Filtrar</h2>
          
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                placeholder="Buscar por nombre, descripción o ingrediente..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold"
              >
                ✖️ Limpiar
              </button>
            )}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setVista('grid')}
                className={`px-3 py-2 rounded ${vista === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''} text-gray-700 dark:text-gray-200`}
                title="Vista cuadrícula"
              >
                ▦
              </button>
              <button
                onClick={() => setVista('lista')}
                className={`px-3 py-2 rounded ${vista === 'lista' ? 'bg-white dark:bg-gray-600 shadow' : ''} text-gray-700 dark:text-gray-200`}
                title="Vista lista"
              >
                ☰
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📂 Categoría</label>
              <select
                value={categoriaFiltro || ''}
                onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todas</option>
                {Object.entries(CATEGORIAS).map(([id, cat]) => (
                  <option key={id} value={id}>
                    {cat.icono} {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🌿 Temperamento</label>
              <select
                value={temperamentoFiltro}
                onChange={(e) => setTemperamentoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todos</option>
                {TEMPERAMENTOS.map((temp) => (
                  <option key={temp.valor} value={temp.valor}>
                    {temp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🚫 Filtro Hildegardiano</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700">
                <input
                  type="checkbox"
                  checked={soloSinVenenos}
                  onChange={(e) => setSoloSinVenenos(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Solo sin venenos</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">✨ Base Alegría</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700">
                <input
                  type="checkbox"
                  checked={soloBaseAlegria}
                  onChange={(e) => setSoloBaseAlegria(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">Solo base alegría</span>
              </label>
            </div>
          </div>

          {/* Fila 2: Estado, Precio, Gluten, Índice glucémico, Nutrientes */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">👁️ Estado</label>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="todos">Todos</option>
                <option value="publicados">🟢 Publicados</option>
                <option value="despublicados">⚪ Despublicados</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">💲 Precio</label>
              <select
                value={precioFiltro}
                onChange={(e) => setPrecioFiltro(e.target.value as typeof precioFiltro)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="todos">Todos</option>
                <option value="con_precio">💰 Con precio</option>
                <option value="gratis">🎁 Gratis</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🌾 Gluten</label>
              <select
                value={glutenFiltro}
                onChange={(e) => setGlutenFiltro(e.target.value as typeof glutenFiltro)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="todos">Todos</option>
                <option value="con">Con gluten</option>
                <option value="sin">Sin gluten</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">📈 Índice glucémico</label>
              <select
                value={igFiltro}
                onChange={(e) => setIgFiltro(e.target.value as typeof igFiltro)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="todos">Todos</option>
                <option value="bajo">🟢 Bajo (≤ 55)</option>
                <option value="medio">🟡 Medio (56–69)</option>
                <option value="alto">🔴 Alto (≥ 70)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">🧪 Nutrientes</label>
              <button
                type="button"
                onClick={() => setPanelNutrientes((v) => !v)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-between"
              >
                <span>
                  {vitaminasSel.length + mineralesSel.length > 0
                    ? `${vitaminasSel.length + mineralesSel.length} seleccionados`
                    : 'Vitaminas y minerales'}
                </span>
                <span>{panelNutrientes ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>

          {/* Panel de nutrientes (vitaminas / minerales) */}
          {panelNutrientes && (
            <div className="mt-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Mostrar platos que sean <strong>buena fuente</strong> (aportan ≥ {UMBRAL_FUENTE}% del valor diario por porción) de:
              </p>
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">💊 Vitaminas</p>
                <div className="flex flex-wrap gap-1.5">
                  {VITAMINAS.map((v) => {
                    const activo = vitaminasSel.includes(v.clave);
                    return (
                      <button
                        key={v.clave}
                        type="button"
                        onClick={() => toggleEnLista(v.clave, vitaminasSel, setVitaminasSel)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          activo
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-amber-400'
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">⛏️ Minerales</p>
                <div className="flex flex-wrap gap-1.5">
                  {MINERALES.map((m) => {
                    const activo = mineralesSel.includes(m.clave);
                    return (
                      <button
                        key={m.clave}
                        type="button"
                        onClick={() => toggleEnLista(m.clave, mineralesSel, setMineralesSel)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          activo
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-emerald-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {(vitaminasSel.length > 0 || mineralesSel.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setVitaminasSel([]); setMineralesSel([]); }}
                  className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  ✖️ Limpiar nutrientes
                </button>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Mostrando <strong className="text-amber-700 dark:text-amber-400">{platosFiltrados.length}</strong> de <strong>{platos.length}</strong> platos
            </p>
            {platosFiltrados.length === 0 && (
              <p className="text-orange-600 dark:text-orange-400 font-semibold">⚠️ No hay platos con estos filtros</p>
            )}
          </div>
        </div>

        {/* Grid de platos */}
        {vista === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platosFiltrados.map((plato) => {
              const tempDominante = getTemperamentoDominante(plato);
              const tempInfo = TEMPERAMENTOS.find(t => t.valor === tempDominante);
              const tieneVeneno = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_veneno_hildegardiano) || false;
              const tieneBaseAlegria = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_base_alegria) || false;
              const numIngredientes = plato.receta?.ingredientes?.length || 0;
              const categoria = CATEGORIAS[plato.categoria_id];

              return (
                <div
                  key={plato.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 overflow-hidden ${
                    tieneVeneno ? 'border-red-500' : tieneBaseAlegria ? 'border-green-500' : 'border-amber-500'
                  }`}
                >
                  {plato.imagen && (
                    <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <img
                        src={plato.imagen}
                        alt={plato.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🍽️ Sin imagen%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-amber-700 dark:text-amber-400">
                        {formatoPrecio(plato.precio)}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight">
                          {plato.nombre}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {categoria?.icono} {categoria?.nombre || 'Sin categoría'}
                        </p>
                      </div>
                    </div>

                    {plato.descripcion && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{plato.descripcion}</p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                        📅 {nombreDia(plato.dia_semana_id)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        plato.disponible
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {plato.disponible ? '🟢 Publicado' : '⚪ No publicado'}
                      </span>
                      {categoriaIG(plato.indiceGlucemico) && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${IG_INFO[categoriaIG(plato.indiceGlucemico)!].color}`}>
                          📈 {IG_INFO[categoriaIG(plato.indiceGlucemico)!].label} ({plato.indiceGlucemico})
                        </span>
                      )}
                      {tempInfo && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${tempInfo.color}`}>
                          {tempInfo.nombre}
                        </span>
                      )}
                      {tieneVeneno && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          🚫 Veneno
                        </span>
                      )}
                      {tieneBaseAlegria && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          ✨ Alegría
                        </span>
                      )}
                      {numIngredientes > 0 && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          🥕 {numIngredientes} ing.
                        </span>
                      )}
                      {!plato.receta?.id && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                          ⚠️ Sin receta
                        </span>
                      )}
                    </div>

                    {plato.receta?.ingredientes && plato.receta.ingredientes.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                        <p className="font-semibold mb-1">Ingredientes:</p>
                        <p className="line-clamp-2">
                          {plato.receta.ingredientes.slice(0, 5).map(ri => ri.ingrediente.nombre).join(', ')}
                          {plato.receta.ingredientes.length > 5 && ` +${plato.receta.ingredientes.length - 5} más`}
                        </p>
                      </div>
                    )}

                    {/* Acciones de gestión */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {formatoPrecio(plato.precio)}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={() => togglePublicado(plato)}
                        disabled={guardando}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                          plato.disponible
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                        }`}
                        title={plato.disponible ? 'Quitar del menú' : 'Publicar en el menú'}
                      >
                        {plato.disponible ? '⚪ Despublicar' : '🟢 Publicar'}
                      </button>
                      <button
                        onClick={() => { setErrorGuardar(null); setPlatoEditando(plato); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Plato</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Categoría</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Día</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Precio</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Temperamento</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {platosFiltrados.map((plato) => {
                  const tempDominante = getTemperamentoDominante(plato);
                  const tempInfo = TEMPERAMENTOS.find(t => t.valor === tempDominante);
                  const tieneVeneno = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_veneno_hildegardiano) || false;
                  const tieneBaseAlegria = plato.receta?.ingredientes?.some(ri => ri.ingrediente.es_base_alegria) || false;
                  const categoria = CATEGORIAS[plato.categoria_id];

                  return (
                    <tr key={plato.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {plato.imagen && (
                            <img
                              src={plato.imagen}
                              alt={plato.nombre}
                              className="w-12 h-12 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{plato.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{plato.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {categoria?.icono} {categoria?.nombre}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-300">
                        📅 {nombreDia(plato.dia_semana_id)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                        {formatoPrecio(plato.precio)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tempInfo ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${tempInfo.color}`}>
                            {tempInfo.nombre}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          plato.disponible
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {plato.disponible ? '🟢 Publicado' : '⚪ Oculto'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => togglePublicado(plato)}
                            disabled={guardando}
                            className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                            title={plato.disponible ? 'Despublicar' : 'Publicar'}
                          >
                            {plato.disponible ? '⚪' : '🟢'}
                          </button>
                          <button
                            onClick={() => { setErrorGuardar(null); setPlatoEditando(plato); }}
                            className="px-2 py-1 rounded text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {platosFiltrados.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center transition-colors">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">😕 No hay platos con estos filtros</p>
            <button
              onClick={limpiarFiltros}
              className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 font-semibold"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </main>

      {platoEditando && (
        <ModalEditarPlato
          plato={platoEditando}
          guardando={guardando}
          error={errorGuardar}
          onGuardar={guardarPlato}
          onCerrar={() => setPlatoEditando(null)}
        />
      )}
    </div>
  );
}

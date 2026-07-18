'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SelectorIngredientes from '../SelectorIngredientes';

interface IngredienteSeleccionado {
  ingrediente_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface PlatoOpcion {
  id: string;
  nombre: string;
  dia_semana_id?: number | null;
  receta_existente_id?: string | null;
  ocupado?: boolean;
}

interface DatosIniciales {
  platoId: string;
  platoNombre: string;
  platoDescripcion: string;
  tiempoMin: number;
  porciones: number;
  estado: 'borrador' | 'en_proceso' | 'aprobada';
  dificultad: string;
  diaSemanaId: string;
  pasos: string[];
  ingredientes: IngredienteSeleccionado[];
  notasHildegardianas: string;
  interpretacionHildegardiana: string;
}

interface EditarRecetaFormProps {
  recetaId: string; // 'nueva' o el uuid
  platos: PlatoOpcion[];
  initial: DatosIniciales;
}

export default function EditarRecetaForm({ recetaId, platos, initial }: EditarRecetaFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const esNueva = recetaId === 'nueva';

  const [platoId, setPlatoId] = useState(initial.platoId);
  const [platoNombre, setPlatoNombre] = useState(initial.platoNombre);
  const [platoDescripcion, setPlatoDescripcion] = useState(initial.platoDescripcion);
  const [tiempoMin, setTiempoMin] = useState(initial.tiempoMin);
  const [porciones, setPorciones] = useState(initial.porciones);
  const [estado, setEstado] = useState<DatosIniciales['estado']>(initial.estado);
  const [dificultad, setDificultad] = useState(initial.dificultad);
  const [diaSemanaId, setDiaSemanaId] = useState(initial.diaSemanaId);
  const [pasos, setPasos] = useState<string[]>(initial.pasos.length > 0 ? initial.pasos : ['']);
  const [ingredientes, setIngredientes] = useState<IngredienteSeleccionado[]>(initial.ingredientes);
  const [notasHildegardianas, setNotasHildegardianas] = useState(initial.notasHildegardianas);
  const [interpretacionHildegardiana, setInterpretacionHildegardiana] = useState(initial.interpretacionHildegardiana);

  const ESTADOS_RECETA: Array<{ value: DatosIniciales['estado']; label: string }> = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'aprobada', label: 'Aprobada' },
  ];

  const agregarPaso = () => setPasos([...pasos, '']);  const actualizarPaso = (index: number, valor: string) => {
    const nuevos = [...pasos];
    nuevos[index] = valor;
    setPasos(nuevos);
  };
  const eliminarPaso = (index: number) => setPasos(pasos.filter((_, i) => i !== index));

  // Al elegir un plato, precargar su día actual
  const seleccionarPlato = (id: string) => {
    const p = platos.find((x) => x.id === id);
    if (p?.receta_existente_id && p.receta_existente_id !== recetaId) {
      router.push(`/admin/recetas/${p.receta_existente_id}`);
      return;
    }

    setPlatoId(id);
    setPlatoNombre(p?.nombre || '');
    setDiaSemanaId(p?.dia_semana_id != null ? String(p.dia_semana_id) : '');
  };

  const DIAS_SEMANA = [
    { id: 1, nombre: 'Lunes', icono: '🥩' },
    { id: 2, nombre: 'Martes', icono: '🥗' },
    { id: 3, nombre: 'Miércoles', icono: '🍝' },
    { id: 4, nombre: 'Jueves', icono: '🍗' },
    { id: 5, nombre: 'Viernes', icono: '🐟' },
    { id: 6, nombre: 'Sábado', icono: '🍕' },
    { id: 7, nombre: 'Domingo', icono: '🍝' },
  ];

  const leerErrorHttp = async (res: Response, mensajeFallback: string) => {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      if (data?.error) return data.error as string;
    } else {
      const text = await res.text().catch(() => '');
      if (text.includes('/auth/login')) return 'La sesión expiró. Volvé a iniciar sesión.';
      if (text.trim()) return `${mensajeFallback} (HTTP ${res.status})`;
    }

    return mensajeFallback;
  };

  const mostrarErrorVisible = (mensaje: string) => {
    setError(mensaje);
    if (typeof window !== 'undefined') {
      window.alert(mensaje);
    }
  };

  const guardarReceta = async () => {
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      if (!platoId && !platoNombre.trim()) {
        throw new Error('Debés seleccionar un plato existente o indicar el nombre de uno nuevo');
      }
      if (!platoNombre.trim()) throw new Error('Debés indicar el nombre del plato');
      if (pasos.some((p) => !p.trim())) throw new Error('Todos los pasos deben estar completos');
      if (ingredientes.length === 0) throw new Error('Debés agregar al menos un ingrediente');

      // 1. Guardar datos básicos de la receta
      const urlReceta = esNueva ? '/api/admin/recetas' : `/api/admin/recetas/${recetaId}`;
      const methodReceta = esNueva ? 'POST' : 'PUT';

      const resReceta = await fetch(urlReceta, {
        method: methodReceta,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plato_id: platoId,
          plato_nombre: platoNombre.trim(),
          plato_descripcion: platoDescripcion.trim(),
          dia_semana_id: diaSemanaId === '' ? null : Number(diaSemanaId),
          tiempo_min: tiempoMin,
          porciones,
          estado,
          dificultad,
          pasos: pasos.filter((p) => p.trim()),
          // Mantener el JSONB `recetas.ingredientes` sincronizado con el guardado relacional
          ingredientes: ingredientes.map((i) => ({
            ingrediente_id: i.ingrediente_id,
            nombre: i.nombre,
            cantidad: i.cantidad,
            unidad: i.unidad,
          })),
          notas_hildegardianas: notasHildegardianas,
          interpretacion_hildegardiana: interpretacionHildegardiana,
        }),
      });

      const dataReceta = resReceta.ok ? await resReceta.json() : null;
      if (!resReceta.ok) {
        const mensaje = await leerErrorHttp(resReceta, 'Error al guardar receta');
        console.error('Error guardando receta', {
          status: resReceta.status,
          statusText: resReceta.statusText,
          url: urlReceta,
          method: methodReceta,
          mensaje,
        });
        throw new Error(mensaje);
      }

      setMensaje('✅ Receta guardada exitosamente');
      // Invalidar la Router Cache del cliente para que al reabrir la receta
      // se vuelvan a leer los datos frescos del servidor (Next.js App Router).
      router.refresh();
      setTimeout(() => router.push('/admin/recetas'), 1500);
    } catch (err: any) {
      console.error('Fallo en guardarReceta', err);
      mostrarErrorVisible(err.message || 'Error al guardar receta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{esNueva ? '➕ Nueva Receta' : '✏️ Editar Receta'}</h1>
            <p className="text-amber-100 text-sm">Con análisis nutricional automático</p>
          </div>
          <button
            onClick={() => router.push('/admin/recetas')}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            ← Volver
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">❌ {error}</div>
        )}
        {mensaje && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{mensaje}</div>
        )}

        <div className="space-y-6">
          {/* Datos básicos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">📋 Datos Básicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Plato *</label>
                {esNueva && platos.length === 0 && (
                  <p className="mb-2 text-sm font-medium text-amber-700">
                    No hay platos libres sin receta. Podés escribir abajo el nombre para crear un plato nuevo.
                  </p>
                )}
                {!esNueva && (
                  <p className="mb-2 text-base font-bold text-amber-700">
                    🍽️ {platos.find((p) => p.id === platoId)?.nombre || '(plato no encontrado)'}
                  </p>
                )}
                <select
                  value={platoId}
                  onChange={(e) => seleccionarPlato(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Seleccioná un plato...</option>
                  {platos.map((plato) => (
                    <option key={plato.id} value={plato.id}>
                      {plato.nombre}{plato.receta_existente_id && plato.receta_existente_id !== recetaId ? ' · editar receta existente' : ''}
                    </option>
                  ))}
                </select>
                {esNueva && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Si querés crear un plato nuevo, dejá este selector vacío y completá "Nombre del plato".
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Nombre del plato *</label>
                <input
                  type="text"
                  value={platoNombre}
                  onChange={(e) => setPlatoNombre(e.target.value)}
                  placeholder="Ej: Sopa de calabaza con hinojo"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Este nombre actualiza el plato asociado y se reflejará también fuera de la receta.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Descripción del plato</label>
                <textarea
                  value={platoDescripcion}
                  onChange={(e) => setPlatoDescripcion(e.target.value)}
                  placeholder="Ej: Agua con rodajas de limón, jengibre y menta"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Es el texto breve que se muestra debajo del nombre del plato en el menú.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">⏱️ Tiempo (minutos)</label>
                <input
                  type="number"
                  value={tiempoMin}
                  onChange={(e) => setTiempoMin(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">👥 Porciones</label>
                <input
                  type="number"
                  value={porciones}
                  onChange={(e) => setPorciones(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">🏷️ Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as DatosIniciales['estado'])}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  {ESTADOS_RECETA.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Si la base valida transiciones, pasar de borrador a aprobada puede requerir primero en proceso.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">📊 Dificultad</label>
                <select
                  value={dificultad}
                  onChange={(e) => setDificultad(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="fácil">Fácil</option>
                  <option value="media">Media</option>
                  <option value="difícil">Difícil</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">📅 Día de disponibilidad</label>
                <select
                  value={diaSemanaId}
                  onChange={(e) => setDiaSemanaId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">🗓️ Todos los días</option>
                  {DIAS_SEMANA.map((d) => (
                    <option key={d.id} value={d.id}>{d.icono} {d.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Define en qué día del menú aparece el plato de esta receta.</p>
              </div>
            </div>
          </div>

          {/* Ingredientes con selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🥕 Ingredientes</h2>
            <SelectorIngredientes value={ingredientes} onChange={setIngredientes} />
          </div>

          {/* Pasos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">👨‍🍳 Pasos de Preparación</h2>
              <button
                onClick={agregarPaso}
                className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                + Agregar Paso
              </button>
            </div>
            <div className="space-y-3">
              {pasos.map((paso, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <textarea
                    value={paso}
                    onChange={(e) => actualizarPaso(i, e.target.value)}
                    placeholder={`Paso ${i + 1}...`}
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => eliminarPaso(i)}
                    className="flex-shrink-0 bg-red-500 text-white px-3 rounded-lg hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notas Hildegardianas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">✨ Notas Hildegardianas</h2>
            <textarea
              value={notasHildegardianas}
              onChange={(e) => setNotasHildegardianas(e.target.value)}
              placeholder="Sabiduría de Santa Hildegarda sobre este plato..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Interpretación Hildegardiana (informe editorial) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">🌿 Interpretación Hildegardiana</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Informe editorial que se muestra al cliente (acción principal, órgano beneficiado, efecto en el ánimo,
              uso estacional, conclusión…).
            </p>
            <textarea
              value={interpretacionHildegardiana}
              onChange={(e) => setInterpretacionHildegardiana(e.target.value)}
              placeholder="Ej: Acción principal: Cardiotónica y reconstructora. Efecto en el ánimo: Antimelancólico..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Botón Guardar */}
          <button
            onClick={guardarReceta}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? '💾 Guardando...' : '💾 Guardar Receta'}
          </button>
        </div>
      </main>
    </div>
  );
}

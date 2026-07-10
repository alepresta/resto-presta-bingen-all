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
}

interface DatosIniciales {
  platoId: string;
  tiempoMin: number;
  porciones: number;
  dificultad: string;
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

  const [platoId, setPlatoId] = useState(initial.platoId);  const [tiempoMin, setTiempoMin] = useState(initial.tiempoMin);
  const [porciones, setPorciones] = useState(initial.porciones);
  const [dificultad, setDificultad] = useState(initial.dificultad);
  const [pasos, setPasos] = useState<string[]>(initial.pasos.length > 0 ? initial.pasos : ['']);
  const [ingredientes, setIngredientes] = useState<IngredienteSeleccionado[]>(initial.ingredientes);
  const [notasHildegardianas, setNotasHildegardianas] = useState(initial.notasHildegardianas);
  const [interpretacionHildegardiana, setInterpretacionHildegardiana] = useState(initial.interpretacionHildegardiana);

  const agregarPaso = () => setPasos([...pasos, '']);  const actualizarPaso = (index: number, valor: string) => {
    const nuevos = [...pasos];
    nuevos[index] = valor;
    setPasos(nuevos);
  };
  const eliminarPaso = (index: number) => setPasos(pasos.filter((_, i) => i !== index));

  const guardarReceta = async () => {
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      if (!platoId) throw new Error('Debés seleccionar un plato');
      if (pasos.some((p) => !p.trim())) throw new Error('Todos los pasos deben estar completos');
      if (ingredientes.length === 0) throw new Error('Debés agregar al menos un ingrediente');

      // 1. Guardar datos básicos de la receta
      const urlReceta = esNueva ? '/api/admin/recetas' : `/api/admin/recetas/${recetaId}`;
      const methodReceta = esNueva ? 'POST' : 'PUT';

      const resReceta = await fetch(urlReceta, {
        method: methodReceta,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plato_id: platoId,
          tiempo_min: tiempoMin,
          porciones,
          dificultad,
          pasos: pasos.filter((p) => p.trim()),
          notas_hildegardianas: notasHildegardianas,
          interpretacion_hildegardiana: interpretacionHildegardiana,
        }),
      });

      const dataReceta = await resReceta.json();
      if (!resReceta.ok) throw new Error(dataReceta.error || 'Error al guardar receta');

      // 2. Guardar ingredientes en la tabla relacional (ignora los no resueltos)
      const nuevoId = esNueva ? dataReceta.receta.id : recetaId;

      const resIngredientes = await fetch(`/api/admin/recetas/${nuevoId}/ingredientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientes: ingredientes
            .filter((i) => !i.ingrediente_id.startsWith('jsonb:'))
            .map((i) => ({
              ingrediente_id: i.ingrediente_id,
              cantidad: i.cantidad,
              unidad: i.unidad,
            })),
        }),
      });

      if (!resIngredientes.ok) throw new Error('Error al guardar ingredientes');

      setMensaje('✅ Receta guardada exitosamente');
      setTimeout(() => router.push('/admin/recetas'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Datos Básicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Plato *</label>
                {!esNueva && (
                  <p className="mb-2 text-base font-bold text-amber-700">
                    🍽️ {platos.find((p) => p.id === platoId)?.nombre || '(plato no encontrado)'}
                  </p>
                )}
                <select
                  value={platoId}
                  onChange={(e) => setPlatoId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
                >
                  <option value="">Seleccioná un plato...</option>
                  {platos.map((plato) => (
                    <option key={plato.id} value={plato.id}>
                      {plato.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">⏱️ Tiempo (minutos)</label>
                <input
                  type="number"
                  value={tiempoMin}
                  onChange={(e) => setTiempoMin(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Porciones</label>
                <input
                  type="number"
                  value={porciones}
                  onChange={(e) => setPorciones(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Dificultad</label>
                <select
                  value={dificultad}
                  onChange={(e) => setDificultad(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
                >
                  <option value="fácil">Fácil</option>
                  <option value="media">Media</option>
                  <option value="difícil">Difícil</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ingredientes con selector */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🥕 Ingredientes</h2>
            <SelectorIngredientes value={ingredientes} onChange={setIngredientes} />
          </div>

          {/* Pasos */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">👨‍🍳 Pasos de Preparación</h2>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
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
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">✨ Notas Hildegardianas</h2>
            <textarea
              value={notasHildegardianas}
              onChange={(e) => setNotasHildegardianas(e.target.value)}
              placeholder="Sabiduría de Santa Hildegarda sobre este plato..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
            />
          </div>

          {/* Interpretación Hildegardiana (informe editorial) */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">🌿 Interpretación Hildegardiana</h2>
            <p className="text-sm text-gray-500 mb-4">
              Informe editorial que se muestra al cliente (acción principal, órgano beneficiado, efecto en el ánimo,
              uso estacional, conclusión…).
            </p>
            <textarea
              value={interpretacionHildegardiana}
              onChange={(e) => setInterpretacionHildegardiana(e.target.value)}
              placeholder="Ej: Acción principal: Cardiotónica y reconstructora. Efecto en el ánimo: Antimelancólico..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
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

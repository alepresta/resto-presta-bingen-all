'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SelectorIngredientes from '../SelectorIngredientes';

interface IngredienteSeleccionado {
  ingrediente_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

export default function EditarRecetaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // Datos de la receta
  const [platoId, setPlatoId] = useState('');
  const [tiempoMin, setTiempoMin] = useState(30);
  const [porciones, setPorciones] = useState(4);
  const [dificultad, setDificultad] = useState('media');
  const [pasos, setPasos] = useState<string[]>(['']);
  const [ingredientes, setIngredientes] = useState<IngredienteSeleccionado[]>([]);
  const [notasHildegardianas, setNotasHildegardianas] = useState('');
  const [interpretacionHildegardiana, setInterpretacionHildegardiana] = useState('');

  // Lista de platos disponibles
  const [platos, setPlatos] = useState<any[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        // Cargar platos
        const resPlatos = await fetch('/api/admin/platos');
        const dataPlatos = await resPlatos.json();
        setPlatos(dataPlatos.platos || []);

        // Si hay ID, cargar la receta
        if (params.id !== 'nueva') {
          const resReceta = await fetch(`/api/admin/recetas/${params.id}`);
          const dataReceta = await resReceta.json();

          if (dataReceta.receta) {
            const r = dataReceta.receta;
            setPlatoId(r.plato_id);
            setTiempoMin(r.tiempo_min || 30);
            setPorciones(r.porciones || 4);
            setDificultad(r.dificultad || 'media');
            setPasos(r.pasos || ['']);
            setNotasHildegardianas(r.notas_hildegardianas || '');
            setInterpretacionHildegardiana(r.interpretacion_hildegardiana || '');

            // Cargar ingredientes de la nueva tabla
            const resIng = await fetch(`/api/admin/recetas/${params.id}/ingredientes`);
            const dataIng = await resIng.json();

            if (dataIng.ingredientes && dataIng.ingredientes.length > 0) {
              setIngredientes(
                dataIng.ingredientes.map((ri: any) => ({
                  ingrediente_id: ri.ingrediente.id,
                  nombre: ri.ingrediente.nombre,
                  cantidad: ri.cantidad,
                  unidad: ri.unidad,
                }))
              );
            } else if (r.ingredientes && r.ingredientes.length > 0) {
              // Migrar desde JSONB si no hay en la nueva tabla
              console.log('Migrando ingredientes desde JSONB...');
            }
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setCargandoDatos(false);
      }
    };
    cargar();
  }, [params.id]);

  // Pasos
  const agregarPaso = () => setPasos([...pasos, '']);
  const actualizarPaso = (index: number, valor: string) => {
    const nuevos = [...pasos];
    nuevos[index] = valor;
    setPasos(nuevos);
  };
  const eliminarPaso = (index: number) => setPasos(pasos.filter((_, i) => i !== index));

  // Guardar receta
  const guardarReceta = async () => {
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      if (!platoId) throw new Error('Debés seleccionar un plato');
      if (pasos.some((p) => !p.trim())) throw new Error('Todos los pasos deben estar completos');
      if (ingredientes.length === 0) throw new Error('Debés agregar al menos un ingrediente');

      // 1. Guardar datos básicos de la receta
      const urlReceta = params.id === 'nueva' ? '/api/admin/recetas' : `/api/admin/recetas/${params.id}`;
      const methodReceta = params.id === 'nueva' ? 'POST' : 'PUT';

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

      // 2. Guardar ingredientes en la nueva tabla
      const recetaId = params.id === 'nueva' ? dataReceta.receta.id : params.id;

      const resIngredientes = await fetch(`/api/admin/recetas/${recetaId}/ingredientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientes: ingredientes.map((i) => ({
            ingrediente_id: i.ingrediente_id,
            cantidad: i.cantidad,
            unidad: i.unidad,
          })),
        }),
      });

      if (!resIngredientes.ok) throw new Error('Error al guardar ingredientes');

      setMensaje('✅ Receta guardada exitosamente');
      setTimeout(() => router.push('/admin/recetas'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {params.id === 'nueva' ? '➕ Nueva Receta' : '✏️ Editar Receta'}
            </h1>
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
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}
        {mensaje && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {mensaje}
          </div>
        )}

        <div className="space-y-6">
          {/* Datos básicos */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Datos Básicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Plato *</label>
                <select
                  value={platoId}
                  onChange={(e) => setPlatoId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Porciones</label>
                <input
                  type="number"
                  value={porciones}
                  onChange={(e) => setPorciones(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">📊 Dificultad</label>
                <select
                  value={dificultad}
                  onChange={(e) => setDificultad(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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

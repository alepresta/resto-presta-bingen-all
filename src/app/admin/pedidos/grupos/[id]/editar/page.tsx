'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditarPedidoPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [palabraSecreta, setPalabraSecreta] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`/api/admin/pedidos/grupos/${params.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el pedido');

        const grupo = data.grupo;
        setFechaInicio(grupo.fecha_inicio?.split('T')[0] ?? '');
        setFechaFin(grupo.fecha_fin?.split('T')[0] ?? '');
        setPalabraSecreta(grupo.palabra_secreta ?? '');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setCargandoDatos(false);
      }
    };
    cargar();
  }, [params.id]);

  const guardar = async () => {
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      if (!fechaInicio || !fechaFin || !palabraSecreta) {
        throw new Error('Completá todos los campos');
      }
      if (new Date(fechaInicio) > new Date(fechaFin)) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      const res = await fetch(`/api/admin/pedidos/grupos/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'editar',
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          palabra_secreta: palabraSecreta,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      setMensaje('✅ Pedido actualizado');
      setTimeout(() => router.push('/admin/pedidos'), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">✏️ Editar Pedido</h1>
            <p className="text-indigo-100 text-sm">Modificá las fechas y la palabra secreta</p>
          </div>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            ← Volver
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
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

        {cargandoDatos ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
            ⏳ Cargando pedido...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
            {/* Fechas */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">🗓️ Fechas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha de inicio *
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha de fin *
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Palabra secreta */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">🔐 Palabra Secreta</h2>
              <input
                type="text"
                value={palabraSecreta}
                onChange={(e) => setPalabraSecreta(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-2xl text-center tracking-widest"
                placeholder="ABC123"
              />
              <p className="text-xs text-gray-500 mt-2">
                Los clientes usan esta palabra para unirse al pedido
              </p>
            </div>

            {/* Botón */}
            <button
              onClick={guardar}
              disabled={loading || !fechaInicio || !fechaFin || !palabraSecreta}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

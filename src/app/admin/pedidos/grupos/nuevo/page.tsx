'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function generarPalabraSecreta(): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < 6; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

export default function CrearGrupoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [palabraSecreta, setPalabraSecreta] = useState(generarPalabraSecreta());
  const [duracion, setDuracion] = useState(15);

  const handleDuracionChange = (dias: number) => {
    setDuracion(dias);
    if (fechaInicio) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + dias - 1);
      setFechaFin(fin.toISOString().split('T')[0]);
    }
  };

  const handleFechaInicioChange = (fecha: string) => {
    setFechaInicio(fecha);
    if (fecha) {
      const inicio = new Date(fecha);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + duracion - 1);
      setFechaFin(fin.toISOString().split('T')[0]);
    }
  };

  const crearGrupo = async () => {
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      if (!fechaInicio || !fechaFin) {
        throw new Error('Seleccioná las fechas');
      }

      if (new Date(fechaInicio) > new Date(fechaFin)) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      const res = await fetch('/api/admin/pedidos/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          palabra_secreta: palabraSecreta,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear grupo');

      setMensaje('✅ Grupo creado exitosamente');
      setTimeout(() => router.push(`/admin/pedidos/grupos/${data.grupo.id}`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fecha mínima: mañana
  const fechaMinima = new Date();
  fechaMinima.setDate(fechaMinima.getDate() + 1);
  const fechaMinimaStr = fechaMinima.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">➕ Crear Nuevo Grupo de Pedido</h1>
            <p className="text-indigo-100 text-sm">Configurá las fechas y palabra secreta</p>
          </div>
          <button
            onClick={() => router.push('/admin/pedidos/grupos')}
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

        <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Duración */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Duración del Grupo</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleDuracionChange(15)}
                className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                  duracion === 15
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500'
                }`}
              >
                <div className="text-2xl font-bold">15</div>
                <div className="text-sm">días</div>
              </button>
              <button
                type="button"
                onClick={() => handleDuracionChange(21)}
                className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                  duracion === 21
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500'
                }`}
              >
                <div className="text-2xl font-bold">21</div>
                <div className="text-sm">días</div>
              </button>
              <button
                type="button"
                onClick={() => handleDuracionChange(30)}
                className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                  duracion === 30
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500'
                }`}
              >
                <div className="text-2xl font-bold">30</div>
                <div className="text-sm">días</div>
              </button>
            </div>
          </div>

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
                  min={fechaMinimaStr}
                  onChange={(e) => handleFechaInicioChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo: mañana</p>
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
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Se calcula automáticamente</p>
              </div>
            </div>
          </div>

          {/* Palabra secreta */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔐 Palabra Secreta</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={palabraSecreta}
                onChange={(e) => setPalabraSecreta(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-2xl text-center tracking-widest"
                placeholder="ABC123"
              />
              <button
                type="button"
                onClick={() => setPalabraSecreta(generarPalabraSecreta())}
                className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 font-semibold"
                title="Generar nueva palabra"
              >
                🔄
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Los clientes usarán esta palabra para unirse al grupo
            </p>
          </div>

          {/* Preview */}
          {fechaInicio && fechaFin && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500 p-4 rounded">
              <h3 className="font-bold text-indigo-900 mb-2">📋 Resumen</h3>
              <div className="space-y-1 text-sm text-indigo-800">
                <p><strong>Período:</strong> {new Date(fechaInicio).toLocaleDateString('es-AR')} al {new Date(fechaFin).toLocaleDateString('es-AR')}</p>
                <p><strong>Duración:</strong> {duracion} días</p>
                <p><strong>Palabra secreta:</strong> <span className="font-mono font-bold">{palabraSecreta}</span></p>
                <p><strong>Capacidad:</strong> sin límite de miembros</p>
              </div>
            </div>
          )}

          {/* Botón */}
          <button
            onClick={crearGrupo}
            disabled={loading || !fechaInicio || !fechaFin || !palabraSecreta}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? '⏳ Creando...' : '✅ Crear Grupo'}
          </button>
        </div>
      </main>
    </div>
  );
}

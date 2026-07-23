'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AjusteDuracionGrupoProps {
  grupoId: string;
  palabraSecreta: string;
  fechaInicio: string;
  fechaFin: string;
}

function parseFechaLocal(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatFechaLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AjusteDuracionGrupo({
  grupoId,
  palabraSecreta,
  fechaInicio,
  fechaFin,
}: AjusteDuracionGrupoProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const actualizarDuracion = async (dias: number) => {
    setCargando(true);
    setMensaje('');

    try {
      const inicio = parseFechaLocal(fechaInicio);
      const fin = parseFechaLocal(fechaFin);
      const nuevoFin = new Date(fin);
      nuevoFin.setDate(nuevoFin.getDate() + dias);

      if (nuevoFin < inicio) {
        setMensaje('❌ No se puede acortar más: la fecha fin no puede quedar antes del inicio.');
        setCargando(false);
        return;
      }

      const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'editar',
          fecha_inicio: formatFechaLocal(inicio),
          fecha_fin: formatFechaLocal(nuevoFin),
          palabra_secreta: palabraSecreta,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la duración');

      setMensaje(
        dias > 0
          ? `✅ Grupo extendido ${dias} día${dias === 1 ? '' : 's'}.`
          : `✅ Grupo acortado ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}.`
      );

      router.refresh();
    } catch (error: any) {
      setMensaje(`❌ ${error.message || 'Error al actualizar la duración'}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">🗓️ Duración del grupo</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Podés agregar o quitar días rápidamente para extender o acortar el período.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => actualizarDuracion(1)}
          disabled={cargando}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          +1 día
        </button>
        <button
          type="button"
          onClick={() => actualizarDuracion(7)}
          disabled={cargando}
          className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
        >
          +7 días
        </button>
        <button
          type="button"
          onClick={() => actualizarDuracion(-1)}
          disabled={cargando}
          className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
        >
          -1 día
        </button>
        <button
          type="button"
          onClick={() => actualizarDuracion(-7)}
          disabled={cargando}
          className="px-3 py-2 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50"
        >
          -7 días
        </button>
      </div>

      {mensaje && (
        <div className="text-sm rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
          {mensaje}
        </div>
      )}
    </div>
  );
}
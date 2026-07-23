'use client';

import { useState } from 'react';

interface AccionesGrupoProps {
  grupoId: string;
  estado: string;
}

type AccionModal = {
  key: 'cancelar' | 'eliminar';
  titulo: string;
  descripcion: string;
  confirmarLabel: string;
  estilo: 'orange' | 'red';
};

export default function AccionesGrupo({ grupoId, estado }: AccionesGrupoProps) {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [accionPendiente, setAccionPendiente] = useState<AccionModal | null>(null);

  const estiloConfirmar = {
    orange: 'bg-orange-600 hover:bg-orange-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const ejecutarAccion = async (accion: 'cancelar' | 'eliminar') => {
    setCargando(true);
    try {
      if (accion === 'eliminar') {
        const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al eliminar');
        }

        setMensaje('🗑️ Grupo eliminado');
      } else {
        const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al actualizar el estado del grupo');
        }

        if (accion === 'cancelar') setMensaje('❌ Grupo cancelado');
      }

      setAccionPendiente(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  return (
    <div className="relative">
      {mensaje && (
        <div className="absolute top-0 right-0 transform -translate-y-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg px-3 py-2 text-sm z-10 mb-2 whitespace-nowrap">
          {mensaje}
        </div>
      )}
      
      <div className="flex gap-2">
        {/* Si está armando: mostrar cancelar */}
        {estado === 'armando' && (
          <>
            <button
              type="button"
              onClick={() =>
                setAccionPendiente({
                  key: 'cancelar',
                  titulo: 'Cancelar grupo',
                  descripcion:
                    'Cambia el estado a cancelado. El grupo ya no debe usarse para seguir armando el pedido.',
                  confirmarLabel: 'Sí, cancelar grupo',
                  estilo: 'orange',
                })
              }
              disabled={cargando}
              className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-600 dark:hover:bg-orange-500 font-semibold text-sm disabled:opacity-50"
              title="Cancelar grupo"
            >
              ❌ Cancelar
            </button>
          </>
        )}

        {/* Botón eliminar siempre visible */}
        <button
          type="button"
          onClick={() =>
            setAccionPendiente({
              key: 'eliminar',
              titulo: 'Eliminar grupo',
              descripcion:
                'Borra el grupo y todos sus datos asociados (miembros e ítems). Esta acción es permanente y no se puede deshacer.',
              confirmarLabel: 'Sí, eliminar definitivamente',
              estilo: 'red',
            })
          }
          disabled={cargando}
          className="bg-red-500 dark:bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-600 dark:hover:bg-red-500 font-semibold text-sm disabled:opacity-50"
          title="Eliminar grupo"
        >
          🗑️ Eliminar
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
        {estado === 'armando' && (
          <p>❌ Cancelar: marca el grupo como cancelado.</p>
        )}
        <p>🗑️ Eliminar: borra definitivamente grupo, miembros e ítems.</p>
      </div>

      {accionPendiente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => !cargando && setAccionPendiente(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{accionPendiente.titulo}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{accionPendiente.descripcion}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAccionPendiente(null)}
                disabled={cargando}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => ejecutarAccion(accionPendiente.key)}
                disabled={cargando}
                className={`px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${estiloConfirmar[accionPendiente.estilo]}`}
              >
                {cargando ? 'Procesando...' : accionPendiente.confirmarLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

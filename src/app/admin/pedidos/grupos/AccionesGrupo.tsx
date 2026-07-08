'use client';

import { useState } from 'react';

interface AccionesGrupoProps {
  grupoId: string;
  estado: string;
}

export default function AccionesGrupo({ grupoId, estado }: AccionesGrupoProps) {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const confirmarGrupo = async () => {
    if (!confirm('✅ ¿Confirmar este grupo?\n\nEsto marcará el pedido como confirmado y listo para preparar.')) return;
    
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'confirmar' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al confirmar');
      }

      setMensaje('✅ Grupo confirmado');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const desconfirmarGrupo = async () => {
    if (!confirm('⚠️ ¿Desconfirmar este grupo?\n\nEl grupo volverá al estado "armando" y podrá ser modificado.')) return;
    
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'desconfirmar' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al desconfirmar');
      }

      setMensaje('↩️ Grupo desconfirmado');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const eliminarGrupo = async () => {
    if (!confirm('⚠️ ¿Eliminar este grupo?\n\nEsta acción NO se puede deshacer.')) return;
    if (!confirm('❌ ¿Estás 100% seguro?\n\nSe perderán todos los datos del grupo.')) return;
    
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setMensaje('🗑️ Grupo eliminado');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const cancelarGrupo = async () => {
    if (!confirm('❌ ¿Cancelar este grupo?\n\nEl grupo quedará cancelado y no se podrá usar.')) return;
    
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cancelar' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cancelar');
      }

      setMensaje('❌ Grupo cancelado');
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
        <div className="absolute top-0 right-0 transform -translate-y-full bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm z-10 mb-2 whitespace-nowrap">
          {mensaje}
        </div>
      )}
      
      <div className="flex gap-2">
        {/* Si está armando: mostrar confirmar y cancelar */}
        {estado === 'armando' && (
          <>
            <button
              type="button"
              onClick={confirmarGrupo}
              disabled={cargando}
              className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 font-semibold text-sm disabled:opacity-50"
              title="Confirmar grupo"
            >
              ✅ Confirmar
            </button>
            <button
              type="button"
              onClick={cancelarGrupo}
              disabled={cargando}
              className="bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 font-semibold text-sm disabled:opacity-50"
              title="Cancelar grupo"
            >
              ❌ Cancelar
            </button>
          </>
        )}

        {/* Si está confirmado: mostrar desconfirmar */}
        {estado === 'confirmado' && (
          <button
            type="button"
            onClick={desconfirmarGrupo}
            disabled={cargando}
            className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 font-semibold text-sm disabled:opacity-50"
            title="Desconfirmar grupo (volver a armando)"
          >
            ↩️ Desconfirmar
          </button>
        )}

        {/* Botón eliminar siempre visible */}
        <button
          type="button"
          onClick={eliminarGrupo}
          disabled={cargando}
          className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 font-semibold text-sm disabled:opacity-50"
          title="Eliminar grupo"
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
}

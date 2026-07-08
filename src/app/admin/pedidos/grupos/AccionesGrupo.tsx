'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AccionesGrupoProps {
  grupoId: string;
  estado: string;
}

export default function AccionesGrupo({ grupoId, estado }: AccionesGrupoProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const confirmarGrupo = async () => {
    if (!confirm('¿Confirmar este grupo? Esta acción marcará el pedido como confirmado.')) return;
    
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
      setTimeout(() => router.refresh(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const eliminarGrupo = async () => {
    if (!confirm('⚠️ ¿Eliminar este grupo? Esta acción NO se puede deshacer.')) return;
    if (!confirm('¿Estás 100% seguro? Se perderán todos los datos del grupo.')) return;
    
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
      setTimeout(() => router.refresh(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const cancelarGrupo = async () => {
    if (!confirm('¿Cancelar este grupo? Los miembros serán notificados.')) return;
    
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
      setTimeout(() => router.refresh(), 1000);
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
        <div className="absolute top-0 right-0 transform -translate-y-full bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm z-10 mb-2">
          {mensaje}
        </div>
      )}
      
      <div className="flex gap-2">
        {estado === 'armando' && (
          <button
            onClick={confirmarGrupo}
            disabled={cargando}
            className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 font-semibold text-sm disabled:opacity-50"
            title="Confirmar grupo"
          >
            ✅
          </button>
        )}
        
        {estado === 'armando' && (
          <button
            onClick={cancelarGrupo}
            disabled={cargando}
            className="bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 font-semibold text-sm disabled:opacity-50"
            title="Cancelar grupo"
          >
            ❌
          </button>
        )}
        
        <button
          onClick={eliminarGrupo}
          disabled={cargando}
          className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 font-semibold text-sm disabled:opacity-50"
          title="Eliminar grupo"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

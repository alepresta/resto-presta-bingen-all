'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: string;
  nombre: string;
  email: string;
}

interface Miembro {
  id: string;
  cliente_id: string;
  cliente: Cliente;
}

interface GestionMiembrosProps {
  grupoId: string;
  miembrosActuales: Miembro[];
  clientesDisponibles: Cliente[];
}

export default function GestionMiembros({
  grupoId,
  miembrosActuales,
  clientesDisponibles,
}: GestionMiembrosProps) {
  const router = useRouter();
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Filtrar clientes que ya son miembros
  const clientesNoMiembros = clientesDisponibles.filter(
    (c) => !miembrosActuales.some((m) => m.cliente_id === c.id)
  );

  const agregarMiembro = async () => {
    if (!clienteSeleccionado) {
      setMensaje('❌ Seleccioná un cliente');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}/miembros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteSeleccionado }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al agregar');
      }

      setMensaje('✅ Miembro agregado');
      setClienteSeleccionado('');
      setTimeout(() => router.refresh(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const eliminarMiembro = async (miembroId: string) => {
    if (!confirm('¿Eliminar este miembro del grupo?')) return;

    setCargando(true);
    try {
      const res = await fetch(`/api/admin/pedidos/grupos/${grupoId}/miembros/${miembroId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }

      setMensaje('🗑️ Miembro eliminado');
      setTimeout(() => router.refresh(), 1000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  return (
    <div className="border-t pt-4">
      {mensaje && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm">
          {mensaje}
        </div>
      )}

      {/* Agregar miembro */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Agregar miembro</h3>
        <div className="flex gap-2">
          <select
            value={clienteSeleccionado}
            onChange={(e) => setClienteSeleccionado(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccioná un cliente...</option>
            {clientesNoMiembros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.email})
              </option>
            ))}
          </select>
          <button
            onClick={agregarMiembro}
            disabled={cargando || !clienteSeleccionado}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-semibold disabled:opacity-50"
          >
            ➕ Agregar
          </button>
        </div>
      </div>

      {/* Lista de miembros con botón eliminar */}
      <div>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Eliminar miembros</h3>
        <div className="space-y-2">
          {miembrosActuales.map((miembro) => (
            <div key={miembro.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{miembro.cliente.nombre}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">{miembro.cliente.email}</p>
              </div>
              <button
                onClick={() => eliminarMiembro(miembro.id)}
                disabled={cargando}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm disabled:opacity-50"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

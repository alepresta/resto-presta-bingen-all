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
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [miembroAEliminar, setMiembroAEliminar] = useState<Miembro | null>(null);

  // Filtrar clientes que ya son miembros
  const clientesNoMiembros = clientesDisponibles.filter(
    (c) => !miembrosActuales.some((m) => m.cliente_id === c.id)
  );

  // Filtrar por texto de búsqueda (nombre o email, sin acentos)
  const normalizar = (v: string) =>
    (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const termino = normalizar(busqueda);
  const clientesFiltrados = termino
    ? clientesNoMiembros.filter(
        (c) => normalizar(c.nombre).includes(termino) || normalizar(c.email).includes(termino)
      )
    : clientesNoMiembros;

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
      setMiembroAEliminar(null);
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
        <input
          type="text"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setClienteSeleccionado('');
          }}
          placeholder="🔍 Buscar cliente por nombre o email..."
          className="w-full mb-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <select
            value={clienteSeleccionado}
            onChange={(e) => setClienteSeleccionado(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">
              {clientesFiltrados.length === 0
                ? 'Sin resultados'
                : `Seleccioná un cliente... (${clientesFiltrados.length})`}
            </option>
            {clientesFiltrados.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.email}) · ID: {c.id}
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
                <p className="text-[11px] text-gray-500 dark:text-gray-400 break-all">ID cliente: {miembro.cliente_id}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 break-all">ID miembro: {miembro.id}</p>
              </div>
              <button
                onClick={() => setMiembroAEliminar(miembro)}
                disabled={cargando}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm disabled:opacity-50"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {miembroAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => !cargando && setMiembroAEliminar(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Eliminar miembro</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              Vas a quitar a <strong>{miembroAEliminar.cliente.nombre}</strong> del grupo. Esta persona dejará de participar y sus confirmaciones no contarán para el estado del pedido.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMiembroAEliminar(null)}
                disabled={cargando}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => eliminarMiembro(miembroAEliminar.id)}
                disabled={cargando}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {cargando ? 'Eliminando...' : 'Sí, eliminar miembro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

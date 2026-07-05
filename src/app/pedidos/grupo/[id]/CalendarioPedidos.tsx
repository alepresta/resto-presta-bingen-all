'use client';

import { useState, useEffect } from 'react';
import { DIAS_SEMANA, CATEGORIAS_COMIDA } from '@/lib/pedidos';

interface Plato {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria_id: number;
  dia_semana_id: number | null;
  disponible_todos_dias: boolean;
  alergenos: string[];
  tags: string[];
}

interface Cliente {
  id: string;
  nombre: string;
  email: string;
}

interface Miembro {
  id: string;
  cliente_id: string;
  cliente: Cliente;
  rol: string;
  confirmado_general: boolean;
}

interface ItemPedido {
  id: string;
  fecha: string;
  tipo_comida: string;
  plato_id: string;
  cantidad: number;
  seleccionado_por: string;
  votos: string[];
  plato?: Plato;
}

interface CalendarioPedidosProps {
  grupoId: string;
  fechaInicio: string;
  fechaFin: string;
  miembros: Miembro[];
  items: ItemPedido[];
  platos: Plato[];
  clienteActualId: string;
}

const TIPOS_COMIDA = [
  { id: 'desayuno', label: 'Desayuno', icono: '☕', categoriaId: CATEGORIAS_COMIDA.DESAYUNO },
  { id: 'almuerzo', label: 'Almuerzo', icono: '🍽️', categoriaId: CATEGORIAS_COMIDA.PLATO_PRINCIPAL },
  { id: 'guarnicion', label: 'Guarnición', icono: '🥗', categoriaId: CATEGORIAS_COMIDA.GUARNICION },
  { id: 'postre', label: 'Postre', icono: '🍰', categoriaId: CATEGORIAS_COMIDA.POSTRE },
  { id: 'bebida', label: 'Bebida', icono: '🥤', categoriaId: CATEGORIAS_COMIDA.BEBIDA },
];

export default function CalendarioPedidos({
  grupoId,
  fechaInicio,
  fechaFin,
  miembros,
  items: itemsIniciales,
  platos,
  clienteActualId,
}: CalendarioPedidosProps) {
  const [items, setItems] = useState<ItemPedido[]>(itemsIniciales);
  const [modalAbierto, setModalAbierto] = useState<{ fecha: string; tipo: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Generar array de fechas del plan
  const fechas = [];
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const actual = new Date(inicio);
  while (actual <= fin) {
    fechas.push(new Date(actual));
    actual.setDate(actual.getDate() + 1);
  }

  // Obtener item para una fecha y tipo específico
  const getItem = (fecha: string, tipo: string) => {
    return items.find((item) => item.fecha === fecha && item.tipo_comida === tipo);
  };

  // Obtener nombre del cliente que seleccionó
  const getNombreCliente = (clienteId: string) => {
    const miembro = miembros.find((m) => m.cliente_id === clienteId);
    return miembro?.cliente.nombre || 'Desconocido';
  };

  // Filtrar platos disponibles para una fecha y tipo
  const getPlatosDisponibles = (fecha: string, tipo: string) => {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay() === 0 ? 7 : fechaObj.getDay();
    const tipoInfo = TIPOS_COMIDA.find((t) => t.id === tipo);
    if (!tipoInfo) return [];

    return platos.filter((plato) => {
      if (plato.categoria_id !== tipoInfo.categoriaId) return false;
      if (plato.disponible_todos_dias) return true;
      if (plato.dia_semana_id === null) return true;
      return plato.dia_semana_id === diaSemana;
    });
  };

  // Seleccionar plato
  const seleccionarPlato = async (fecha: string, tipo: string, platoId: string) => {
    setCargando(true);
    setMensaje('');

    try {
      const plato = platos.find((p) => p.id === platoId);
      if (!plato) throw new Error('Plato no encontrado');

      const response = await fetch(`/api/grupos/${grupoId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteActualId,
          fecha,
          tipo_comida: tipo,
          plato_id: platoId,
          cantidad: 1,
          precio_unitario: plato.precio,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al seleccionar');
      }

      const data = await response.json();

      // Actualizar estado local
      const nuevosItems = items.filter(
        (item) => !(item.fecha === fecha && item.tipo_comida === tipo)
      );
      nuevosItems.push(data.item);
      setItems(nuevosItems);

      setModalAbierto(null);
      setMensaje(`✅ ${plato.nombre} seleccionado para ${new Date(fecha).toLocaleDateString('es-AR')}`);
      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 3000);
    } finally {
      setCargando(false);
    }
  };

  // Confirmar acuerdo general
  const confirmarGeneral = async () => {
    setCargando(true);
    try {
      const response = await fetch(`/api/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'confirmar',
          cliente_id: clienteActualId,
        }),
      });

      if (!response.ok) throw new Error('Error al confirmar');

      const data = await response.json();
      setMensaje(data.mensaje);
      setTimeout(() => setMensaje(''), 5000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Calcular total
  const total = items.reduce((sum, item) => {
    const plato = platos.find((p) => p.id === item.plato_id);
    return sum + (plato?.precio || 0) * item.cantidad;
  }, 0);

  const clienteActual = miembros.find((m) => m.cliente_id === clienteActualId);
  const miembrosConfirmados = miembros.filter((m) => m.confirmado_general).length;
  const todosConfirmaron = miembrosConfirmados === miembros.length && miembros.length === 4;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold font-serif">📅 Plan de 30 Días</h1>
          <p className="text-amber-100 mt-1">
            {fechas.length} días · {miembros.length}/4 miembros · {items.length} platos seleccionados
          </p>
        </div>
      </header>

      {/* Miembros del grupo */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <h2 className="font-bold text-gray-800 mb-3">👥 Miembros del Grupo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {miembros.map((miembro) => (
              <div
                key={miembro.id}
                className={`p-3 rounded-lg border-2 ${
                  miembro.confirmado_general
                    ? 'bg-green-50 border-green-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {miembro.confirmado_general ? '✅' : '⏳'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {miembro.cliente.nombre}
                    </p>
                    <p className="text-xs text-gray-600">
                      {miembro.rol === 'creador' ? '👑 Creador' : '👤 Miembro'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
            {mensaje}
          </div>
        </div>
      )}

      {/* Calendario */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="space-y-4">
          {fechas.map((fecha) => {
            const fechaStr = fecha.toISOString().split('T')[0];
            const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();
            const diaInfo = DIAS_SEMANA.find((d) => d.id === diaSemana);

            return (
              <div key={fechaStr} className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {diaInfo?.icono} {diaInfo?.nombre}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {fecha.toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-xs text-amber-700 font-semibold mt-1">
                      Tema: {diaInfo?.tematica}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {TIPOS_COMIDA.map((tipo) => {
                    const item = getItem(fechaStr, tipo.id);

                    return (
                      <button
                        key={tipo.id}
                        onClick={() => setModalAbierto({ fecha: fechaStr, tipo: tipo.id })}
                        disabled={cargando}
                        className={`p-3 rounded-lg text-left transition-all ${
                          item
                            ? 'bg-green-100 border-2 border-green-500 hover:bg-green-200'
                            : 'bg-gray-50 border-2 border-dashed border-gray-300 hover:border-amber-500 hover:bg-amber-50'
                        }`}
                      >
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          {tipo.icono} {tipo.label}
                        </p>
                        {item ? (
                          <>
                            <p className="text-sm font-bold text-gray-800">
                              {item.plato?.nombre || 'Cargando...'}
                            </p>
                            <p className="text-xs text-green-700 font-semibold mt-1">
                              ${item.plato?.precio.toLocaleString('es-AR')}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              👤 {getNombreCliente(item.seleccionado_por)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Click para seleccionar</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen y Confirmación */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">💰 Resumen del Pedido</h2>
              <p className="text-sm text-gray-600 mt-1">
                {items.length} platos seleccionados · {miembrosConfirmados}/4 confirmaciones
              </p>
            </div>
            <p className="text-3xl font-bold text-amber-600">
              ${total.toLocaleString('es-AR')}
            </p>
          </div>

          <button
            onClick={confirmarGeneral}
            disabled={cargando || clienteActual?.confirmado_general || todosConfirmaron}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              clienteActual?.confirmado_general
                ? 'bg-green-500 text-white cursor-not-allowed'
                : todosConfirmaron
                ? 'bg-blue-500 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg'
            }`}
          >
            {clienteActual?.confirmado_general
              ? '✅ Ya confirmaste tu acuerdo'
              : todosConfirmaron
              ? '🎉 ¡Todos confirmaron! Pedido enviado'
              : '✅ Confirmar que estoy de acuerdo con el menú'}
          </button>

          {todosConfirmaron && (
            <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-semibold">
                🎉 ¡Excelente! Los 4 miembros confirmaron el pedido. El restaurante lo preparará con anticipación.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Selección de Plato */}
      {modalAbierto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalAbierto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-amber-700 to-orange-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    Seleccioná {TIPOS_COMIDA.find((t) => t.id === modalAbierto.tipo)?.label}
                  </h2>
                  <p className="text-amber-100 mt-1">
                    {new Date(modalAbierto.fecha).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setModalAbierto(null)}
                  className="text-white hover:text-amber-200 text-3xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).map((plato) => (
                  <button
                    key={plato.id}
                    onClick={() =>
                      seleccionarPlato(modalAbierto.fecha, modalAbierto.tipo, plato.id)
                    }
                    disabled={cargando}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-left disabled:opacity-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{plato.nombre}</h3>
                        <p className="text-sm text-gray-600 mt-1">{plato.descripcion}</p>
                        {plato.alergenos.length > 0 && (
                          <p className="text-xs text-red-600 mt-2">
                            ⚠️ {plato.alergenos.join(', ')}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-amber-600 ml-4">
                        ${plato.precio.toLocaleString('es-AR')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


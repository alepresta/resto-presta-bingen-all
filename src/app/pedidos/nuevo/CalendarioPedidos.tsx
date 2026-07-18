'use client';

import { useState, useMemo } from 'react';
import { DIAS_SEMANA, CATEGORIAS_COMIDA, TIPO_COMIDA_MAP } from '@/lib/pedidos';
import {
  calcularFechaMinimaPedido,
  generarFechasEntre,
  obtenerDiaSemana,
  validarPlatoParaDia,
} from '@/lib/pedidos';

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

interface Categoria {
  id: number;
  nombre: string;
  icono: string;
}

interface ItemSeleccionado {
  fecha: string;
  tipo_comida: string;
  plato: Plato;
}

interface CalendarioPedidosProps {
  restaurante: { id: string; nombre: string; tagline: string };
  platos: Plato[];
  categorias: Categoria[];
}

export default function CalendarioPedidos({ restaurante, platos, categorias }: CalendarioPedidosProps) {
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [itemsSeleccionados, setItemsSeleccionados] = useState<ItemSeleccionado[]>([]);
  const [diaActivo, setDiaActivo] = useState<string | null>(null);
  const [platoActivoModal, setPlatoActivoModal] = useState<{ fecha: string; tipo: string } | null>(null);

  // Calcular fecha mínima (hoy + 10 días)
  const fechaMinima = useMemo(() => {
    const min = calcularFechaMinimaPedido();
    return min.toISOString().split('T')[0];
  }, []);

  // Generar fechas del plan
  const fechasDelPlan = useMemo(() => {
    if (!fechaInicio || !fechaFin) return [];
    return generarFechasEntre(new Date(fechaInicio), new Date(fechaFin));
  }, [fechaInicio, fechaFin]);

  // Calcular total
  const total = useMemo(() => {
    return itemsSeleccionados.reduce((sum, item) => sum + item.plato.precio, 0);
  }, [itemsSeleccionados]);

  // Filtrar platos por categoría y día
  const obtenerPlatosDisponibles = (fecha: string, tipoComida: string) => {
    const fechaObj = new Date(fecha);
    const diaSemana = obtenerDiaSemana(fechaObj);

    // Mapear tipo_comida a categoria_id
    const categoriaIdMap: Record<string, number> = {
      desayuno: CATEGORIAS_COMIDA.DESAYUNO,
      almuerzo: CATEGORIAS_COMIDA.PLATO_PRINCIPAL,
      guarnicion: CATEGORIAS_COMIDA.GUARNICION,
      postre: CATEGORIAS_COMIDA.POSTRE,
      bebida: CATEGORIAS_COMIDA.BEBIDA,
    };

    const categoriaId = categoriaIdMap[tipoComida];

    return platos.filter((plato) => {
      if (plato.categoria_id !== categoriaId) return false;

      const validacion = validarPlatoParaDia(
        plato.categoria_id,
        plato.dia_semana_id,
        plato.disponible_todos_dias,
        diaSemana
      );

      return validacion.valido;
    });
  };

  // Seleccionar plato
  const seleccionarPlato = (fecha: string, tipo: string, plato: Plato) => {
    // Remover selección anterior si existe
    const nuevosItems = itemsSeleccionados.filter(
      (item) => !(item.fecha === fecha && item.tipo_comida === tipo)
    );

    // Agregar nueva selección
    nuevosItems.push({ fecha, tipo_comida: tipo, plato });

    setItemsSeleccionados(nuevosItems);
    setPlatoActivoModal(null);
  };

  // Obtener plato seleccionado para una fecha y tipo
  const getItemSeleccionado = (fecha: string, tipo: string) => {
    return itemsSeleccionados.find(
      (item) => item.fecha === fecha && item.tipo_comida === tipo
    );
  };

  // Confirmar pedido
  const confirmarPedido = async () => {
    if (itemsSeleccionados.length === 0) {
      alert('Debés seleccionar al menos un plato');
      return;
    }

    // Aquí iría la lógica para guardar el pedido en Supabase
    alert(`Pedido confirmado! Total: $${total.toLocaleString('es-AR')}`);
    console.log('Items:', itemsSeleccionados);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold font-serif text-center">{restaurante.nombre}</h1>
          <p className="text-center italic text-amber-100 mt-1">Armá tu plan de 30 días</p>
        </div>
      </header>

      {/* Selector de fechas */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">📅 Seleccioná las fechas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Fecha de inicio (mínimo 10 días desde hoy)
              </label>
              <input
                type="date"
                min={fechaMinima}
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Fecha de fin (máximo 30 días)
              </label>
              <input
                type="date"
                min={fechaInicio || fechaMinima}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calendario de 30 días */}
      {fechasDelPlan.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              🍽️ Armá tu menú ({fechasDelPlan.length} días)
            </h2>

            <div className="space-y-4">
              {fechasDelPlan.map((fecha) => {
                const fechaStr = fecha.toISOString().split('T')[0];
                const diaSemana = obtenerDiaSemana(fecha);
                const diaInfo = DIAS_SEMANA.find((d) => d.id === diaSemana);

                return (
                  <div key={fechaStr} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">
                          {diaInfo?.icono} {diaInfo?.nombre} - {fecha.toLocaleDateString('es-AR')}
                        </h3>
                        <p className="text-sm text-amber-700">Tema: {diaInfo?.tematica}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {['desayuno', 'almuerzo', 'guarnicion', 'postre', 'bebida'].map((tipo) => {
                        const item = getItemSeleccionado(fechaStr, tipo);
                        const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1);

                        return (
                          <button
                            key={tipo}
                            onClick={() => setPlatoActivoModal({ fecha: fechaStr, tipo })}
                            className={`p-3 rounded-lg text-left transition-all ${
                              item
                                ? 'bg-green-100 border-2 border-green-500'
                                : 'bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-500'
                            }`}
                          >
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{tipoLabel}</p>
                            {item ? (
                              <>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{item.plato.nombre}</p>
                                <p className="text-xs text-green-700 font-semibold">
                                  ${item.plato.precio.toLocaleString('es-AR')}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">Click para seleccionar</p>
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
        </div>
      )}

      {/* Resumen y total */}
      {itemsSeleccionados.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">💰 Resumen del pedido</h2>
            <div className="flex justify-between items-center">
              <p className="text-lg text-gray-700 dark:text-gray-200">
                {itemsSeleccionados.length} platos seleccionados
              </p>
              <p className="text-3xl font-bold text-amber-600">
                ${total.toLocaleString('es-AR')}
              </p>
            </div>
            <button
              onClick={confirmarPedido}
              className="w-full mt-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all"
            >
              ✅ Confirmar Pedido
            </button>
          </div>
        </div>
      )}

      {/* Modal de selección de plato */}
      {platoActivoModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPlatoActivoModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-amber-700 to-orange-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    Seleccioná {platoActivoModal.tipo}
                  </h2>
                  <p className="text-amber-100 mt-1">
                    {new Date(platoActivoModal.fecha).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setPlatoActivoModal(null)}
                  className="text-white hover:text-amber-200 text-3xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {obtenerPlatosDisponibles(platoActivoModal.fecha, platoActivoModal.tipo).map((plato) => (
                  <button
                    key={plato.id}
                    onClick={() =>
                      seleccionarPlato(platoActivoModal.fecha, platoActivoModal.tipo, plato)
                    }
                    className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">{plato.nombre}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{plato.descripcion}</p>
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


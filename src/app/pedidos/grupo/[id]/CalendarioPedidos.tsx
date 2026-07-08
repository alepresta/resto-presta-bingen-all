'use client';

import { useState, useEffect, useMemo } from 'react';
import { DIAS_SEMANA, CATEGORIAS_COMIDA } from '@/lib/pedidos';

interface Ingrediente {
  id: string;
  nombre: string;
  temperamento: string | null;
  es_veneno_hildegardiano: boolean;
}

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
  receta?: {
    id: string;
    ingredientes?: Array<{
      ingrediente: Ingrediente;
    }>;
  } | null;
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

const CATEGORIAS_FILTRO = [
  { id: 1, nombre: 'Desayuno', icono: '☕' },
  { id: 2, nombre: 'Almuerzo', icono: '🍽️' },
  { id: 3, nombre: 'Guarnición', icono: '🥗' },
  { id: 4, nombre: 'Bebida', icono: '🥤' },
  { id: 5, nombre: 'Postre', icono: '🍰' },
];

const TEMPERAMENTOS = [
  { valor: 'calido', nombre: '🌡️ Cálido' },
  { valor: 'calido_seco', nombre: '🔥 Cálido-Seco' },
  { valor: 'calido_humedo', nombre: '🌊 Cálido-Húmedo' },
  { valor: 'frio', nombre: '❄️ Frío' },
  { valor: 'frio_seco', nombre: '🍃 Frío-Seco' },
  { valor: 'frio_humedo', nombre: '💧 Frío-Húmedo' },
];

export default function CalendarioPedidos({
  grupoId,
  fechaInicio,
  fechaFin,
  miembros,
  items: itemsIniciales,
  platos,
  clienteActualId: clienteActualIdProp,
}: CalendarioPedidosProps) {
  const [items, setItems] = useState<ItemPedido[]>(itemsIniciales);
  const [modalAbierto, setModalAbierto] = useState<{ fecha: string; tipo: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [clienteActualId, setClienteActualId] = useState<string>(clienteActualIdProp);
  const [miembrosState, setMiembrosState] = useState<Miembro[]>(miembros);

  // Estados del buscador (dentro del modal)
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [temperamentoFiltro, setTemperamentoFiltro] = useState<string>('');
  const [soloSinVenenos, setSoloSinVenenos] = useState(false);

  useEffect(() => {
    const clienteGuardado = localStorage.getItem('cliente_actual');
    if (clienteGuardado) {
      try {
        const cliente = JSON.parse(clienteGuardado);
        if (cliente.id) {
          setClienteActualId(cliente.id);
          console.log('✅ Cliente cargado desde localStorage:', cliente.id);
        }
      } catch (e) {
        console.error('❌ Error leyendo cliente del localStorage:', e);
      }
    } else {
      console.log('⚠️ No hay cliente en localStorage, usando:', clienteActualIdProp);
    }
  }, []);

  // Limpiar filtros cuando se cierra el modal
  useEffect(() => {
    if (!modalAbierto) {
      setTextoBusqueda('');
      setCategoriaFiltro(null);
      setTemperamentoFiltro('');
      setSoloSinVenenos(false);
    }
  }, [modalAbierto]);

  const fechas = [];
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const actual = new Date(inicio);
  while (actual <= fin) {
    fechas.push(new Date(actual));
    actual.setDate(actual.getDate() + 1);
  }

  const getItem = (fecha: string, tipo: string) => {
    return items.find((item) => item.fecha === fecha && item.tipo_comida === tipo);
  };

  const getNombreCliente = (clienteId: string) => {
    const miembro = miembrosState.find((m) => m.cliente_id === clienteId);
    return miembro?.cliente.nombre || 'Desconocido';
  };

  // 🔍 Función mejorada con filtros del buscador
  const getPlatosDisponibles = (fecha: string, tipo: string) => {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay() === 0 ? 7 : fechaObj.getDay();
    const tipoInfo = TIPOS_COMIDA.find((t) => t.id === tipo);
    if (!tipoInfo) return [];

    return platos.filter((plato) => {
      // Filtro base: categoría y día
      if (plato.categoria_id !== tipoInfo.categoriaId) return false;
      if (!plato.disponible_todos_dias && plato.dia_semana_id !== null && plato.dia_semana_id !== diaSemana) {
        return false;
      }

      // Filtro por texto (nombre, descripción o ingrediente)
      if (textoBusqueda) {
        const texto = textoBusqueda.toLowerCase();
        const coincideNombre = plato.nombre.toLowerCase().includes(texto);
        const coincideDesc = plato.descripcion?.toLowerCase().includes(texto) || false;
        const coincideIngrediente = plato.receta?.ingredientes?.some(ri =>
          ri.ingrediente.nombre.toLowerCase().includes(texto)
        ) || false;
        if (!coincideNombre && !coincideDesc && !coincideIngrediente) return false;
      }

      // Filtro por categoría adicional
      if (categoriaFiltro && plato.categoria_id !== categoriaFiltro) return false;

      // Filtro por temperamento
      if (temperamentoFiltro && plato.receta?.ingredientes) {
        const tieneTemperamento = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.temperamento === temperamentoFiltro
        );
        if (!tieneTemperamento) return false;
      }

      // Filtro sin venenos
      if (soloSinVenenos && plato.receta?.ingredientes) {
        const tieneVeneno = plato.receta.ingredientes.some(ri =>
          ri.ingrediente.es_veneno_hildegardiano
        );
        if (tieneVeneno) return false;
      }

      return true;
    });
  };

  const seleccionarPlato = async (fecha: string, tipo: string, platoId: string) => {
    setCargando(true);
    setMensaje('');

    try {
      const plato = platos.find((p) => p.id === platoId);
      if (!plato) {
        throw new Error('Plato no encontrado');
      }

      const response = await fetch(`/api/grupos/${grupoId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteActualId,
          fecha,
          tipo_comida: tipo,
          plato_id: platoId,
          cantidad: 1,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Respuesta inválida del servidor');
      }

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      const itemConPlato = {
        ...data.item,
        plato: plato,
      };

      const nuevosItems = items.filter(
        (item) => !(item.fecha === fecha && item.tipo_comida === tipo)
      );
      nuevosItems.push(itemConPlato);
      setItems(nuevosItems);

      setModalAbierto(null);
      setMensaje(`✅ ${plato.nombre} seleccionado para ${new Date(fecha).toLocaleDateString('es-AR')}`);
      setTimeout(() => setMensaje(''), 3000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const confirmarGeneral = async () => {
    setCargando(true);
    setMensaje('');

    try {
      const response = await fetch(`/api/grupos/${grupoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'confirmar',
          cliente_id: clienteActualId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al confirmar');
      }

      const data = await response.json();
      setMensaje(data.mensaje);

      setMiembrosState((prev) =>
        prev.map((m) =>
          m.cliente_id === clienteActualId ? { ...m, confirmado_general: true } : m
        )
      );

      setTimeout(() => setMensaje(''), 5000);
    } catch (error: any) {
      setMensaje(`❌ ${error.message}`);
      setTimeout(() => setMensaje(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const total = items.reduce((sum, item) => {
    const plato = platos.find((p) => p.id === item.plato_id);
    return sum + (plato?.precio || 0) * item.cantidad;
  }, 0);

  const clienteActual = miembrosState.find((m) => m.cliente_id === clienteActualId);
  const miembrosConfirmados = miembrosState.filter((m) => m.confirmado_general).length;
  const todosConfirmaron = miembrosConfirmados === miembrosState.length && miembrosState.length === 4;

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold font-serif">📅 Plan de 30 Días</h1>
          <p className="text-amber-100 mt-1">
            {fechas.length} días · {miembrosState.length}/4 miembros · {items.length} platos seleccionados
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <h2 className="font-bold text-gray-800 mb-3">👥 Miembros del Grupo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {miembrosState.map((miembro) => (
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
                      {miembro.cliente_id === clienteActualId && ' (Vos)'}
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

      {mensaje && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
            {mensaje}
          </div>
        </div>
      )}

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
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg disabled:opacity-50'
            }`}
          >
            {cargando
              ? '⏳ Confirmando...'
              : clienteActual?.confirmado_general
              ? '✅ Ya confirmaste tu acuerdo'
              : todosConfirmaron
              ? '🎉 ¡Todos confirmaron! Pedido enviado'
              : '✅ Confirmar que estoy de acuerdo con el menú'}
          </button>

          {todosConfirmaron && (
            <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-semibold">
                🎉 ¡Excelente! Los 4 miembros confirmaron el pedido.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE PLATOS CON BUSCADOR */}
      {modalAbierto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalAbierto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-700 to-orange-600 text-white p-6 rounded-t-2xl z-10">
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

            {/* 🔍 BUSCADOR INTEGRADO */}
            <div className="sticky top-[120px] bg-amber-50 border-b border-amber-200 p-4 z-10">
              {/* Barra de búsqueda */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={textoBusqueda}
                    onChange={(e) => setTextoBusqueda(e.target.value)}
                    placeholder="🔍 Buscar por nombre o ingrediente..."
                    className="w-full px-4 py-2 pl-10 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>
                {hayFiltros && (
                  <button
                    onClick={() => {
                      setTextoBusqueda('');
                      setCategoriaFiltro(null);
                      setTemperamentoFiltro('');
                      setSoloSinVenenos(false);
                    }}
                    className="bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-semibold border border-gray-300"
                  >
                    ✖️ Limpiar
                  </button>
                )}
              </div>

              {/* Filtros rápidos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={categoriaFiltro || ''}
                  onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">📂 Todas las categorías</option>
                  {CATEGORIAS_FILTRO.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={temperamentoFiltro}
                  onChange={(e) => setTemperamentoFiltro(e.target.value)}
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">🌿 Todos los temperamentos</option>
                  {TEMPERAMENTOS.map((temp) => (
                    <option key={temp.valor} value={temp.valor}>
                      {temp.nombre}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 px-3 py-2 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 bg-white">
                  <input
                    type="checkbox"
                    checked={soloSinVenenos}
                    onChange={(e) => setSoloSinVenenos(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">🚫 Sin venenos</span>
                </label>
              </div>

              {/* Resumen de resultados */}
              <div className="mt-2 text-xs text-amber-800">
                Mostrando <strong>{getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).length}</strong> platos disponibles
              </div>
            </div>

            {/* Lista de platos */}
            <div className="p-6">
              {getPlatosDisponibles(modalAbierto.fecha, modalAbierto.tipo).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">😕 No hay platos con estos filtros</p>
                  <button
                    onClick={() => {
                      setTextoBusqueda('');
                      setCategoriaFiltro(null);
                      setTemperamentoFiltro('');
                      setSoloSinVenenos(false);
                    }}
                    className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 text-sm font-semibold"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
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
                          {plato.alergenos && plato.alergenos.length > 0 && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

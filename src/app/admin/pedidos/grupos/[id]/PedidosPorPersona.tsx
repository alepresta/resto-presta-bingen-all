'use client';

import { useMemo, useState } from 'react';

function parseFechaLocal(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function fmtFechaLarga(fechaStr: string): string {
  return parseFechaLocal(fechaStr).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

interface MiembroSimple {
  id: string;
  cliente_id: string;
  cliente?: {
    nombre?: string;
    email?: string;
  };
}

interface ItemSimple {
  fecha: string;
  tipo_comida: string;
  seleccionado_por?: string | null;
  votos?: string[] | null;
  plato?: {
    nombre?: string | null;
  } | null;
}

interface PedidosPorPersonaProps {
  fechasConItems: string[];
  miembros: MiembroSimple[];
  items: ItemSimple[];
  tiposComidaOrden: string[];
  tipoComidaLabel: Record<string, string>;
}

export default function PedidosPorPersona({
  fechasConItems,
  miembros,
  items,
  tiposComidaOrden,
  tipoComidaLabel,
}: PedidosPorPersonaProps) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set(fechasConItems));

  const itemPorFechaYTipo = useMemo(() => {
    const map = new Map<string, ItemSimple>();
    items.forEach((item) => {
      map.set(`${item.fecha}|${item.tipo_comida}`, item);
    });
    return map;
  }, [items]);

  const expandirTodo = () => setAbiertos(new Set(fechasConItems));
  const colapsarTodo = () => setAbiertos(new Set());

  const setAbierto = (fecha: string, open: boolean) => {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (open) next.add(fecha);
      else next.delete(fecha);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">📋 Qué pidió cada persona</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandirTodo}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          >
            🔽 Expandir todo
          </button>
          <button
            type="button"
            onClick={colapsarTodo}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            🔼 Colapsar todo
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Para cada día y comida, se muestra si cada miembro propuso el plato, si solo está de acuerdo, o si no eligió nada.
      </p>

      {fechasConItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
          Este grupo todavía no tiene platos cargados.
        </div>
      ) : (
        <div className="space-y-4">
          {fechasConItems.map((fecha) => (
            <details
              key={fecha}
              open={abiertos.has(fecha)}
              onToggle={(e) => setAbierto(fecha, (e.target as HTMLDetailsElement).open)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <summary className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
                <p className="font-bold text-gray-800 dark:text-gray-100">
                  {fmtFechaLarga(fecha)}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400">Colapsar / expandir</span>
              </summary>
              <div className="p-4 space-y-3">
                {miembros.map((miembro) => (
                  <div key={`${fecha}-${miembro.id}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                      {miembro.cliente?.nombre || 'Sin nombre'}{' '}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({miembro.cliente?.email || 'sin email'})
                      </span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {tiposComidaOrden.map((tipo) => {
                        const item = itemPorFechaYTipo.get(`${fecha}|${tipo}`);
                        const votos = Array.isArray(item?.votos) ? item?.votos || [] : [];
                        const propuso = !!item && item.seleccionado_por === miembro.cliente_id;
                        const acuerdo = !!item && !propuso && votos.includes(miembro.cliente_id);

                        let texto = 'Sin elegir';
                        let clase = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';

                        if (item && propuso) {
                          texto = `Propuso: ${item.plato?.nombre || 'Plato'}`;
                          clase = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
                        } else if (item && acuerdo) {
                          texto = `De acuerdo con: ${item.plato?.nombre || 'Plato'}`;
                          clase = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
                        } else if (item && !acuerdo && !propuso) {
                          texto = 'No eligió / no confirmó';
                          clase = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
                        }

                        return (
                          <div key={`${fecha}-${miembro.id}-${tipo}`} className={`rounded-lg px-3 py-2 text-sm ${clase}`}>
                            <p className="font-semibold">{tipoComidaLabel[tipo]}</p>
                            <p>{texto}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
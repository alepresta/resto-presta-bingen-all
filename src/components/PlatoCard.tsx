'use client';

import { useState } from 'react';

interface Plato {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  alergenos?: string[];
  tags?: string[];
  es_estrella: boolean;
  propiedades_hildegardianas?: string;
}

export default function PlatoCard({ plato }: { plato: Plato }) {
  const [expanded, setExpanded] = useState(false);

  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(precio);
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-6">
        {/* Header del plato */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-800">
                {plato.nombre}
              </h3>
              {plato.es_estrella && (
                <span className="text-2xl" title="Especialidad de la casa">⭐</span>
              )}
            </div>
            {plato.descripcion && (
              <p className="text-gray-600 mt-2 leading-relaxed">
                {plato.descripcion}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <span className="text-2xl font-bold text-amber-600">
              {formatPrecio(plato.precio)}
            </span>
          </div>
        </div>

        {/* Tags */}
        {plato.tags && plato.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {plato.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Alérgenos */}
        {plato.alergenos && plato.alergenos.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-red-600 font-semibold mb-1">
              ⚠️ Alérgenos:
            </p>
            <div className="flex flex-wrap gap-1">
              {plato.alergenos.map((alergeno, index) => (
                <span
                  key={index}
                  className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200"
                >
                  {alergeno}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Propiedades Hildegardianas (expandible) */}
        {plato.propiedades_hildegardianas && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
            >
              🌿 Ver propiedades medicinales
              <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {expanded && (
              <div className="mt-2 p-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                <p className="text-sm text-gray-700 italic">
                  {plato.propiedades_hildegardianas}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';

interface Plato {
  id: string;
  nombre: string;
  categoria_id: number;
  precio: number;
  disponible: boolean;
  descripcion?: string;
  categoria?: { id: number; nombre: string };
  receta?: {
    ingredientes: Array<{
      ingrediente: {
        nombre: string;
        temperamento: string | null;
        es_veneno_hildegardiano: boolean;
      };
    }>;
  };
}

interface BuscadorPlatosProps {
  platos: Plato[];
  onSeleccion: (platosFiltrados: Plato[]) => void;
}

const CATEGORIAS = [
  { id: 1, nombre: 'Desayuno', icono: '☕' },
  { id: 2, nombre: 'Almuerzo', icono: '🍽️' },
  { id: 3, nombre: 'Guarnición', icono: '🥗' },
  { id: 4, nombre: 'Bebida', icono: '🥤' },
  { id: 5, nombre: 'Postre', icono: '🍰' },
];

const TEMPERAMENTOS = [
  { valor: 'calido', nombre: '🌡️ Cálido', descripcion: 'Balanceado' },
  { valor: 'calido_seco', nombre: '🔥 Cálido-Seco', descripcion: 'Energizante' },
  { valor: 'calido_humedo', nombre: '🌊 Cálido-Húmedo', descripcion: 'Reconfortante' },
  { valor: 'frio', nombre: '❄️ Frío', descripcion: 'Refrescante' },
  { valor: 'frio_seco', nombre: '🍃 Frío-Seco', descripcion: 'Ligero' },
  { valor: 'frio_humedo', nombre: '💧 Frío-Húmedo', descripcion: 'Hidratante' },
];

export default function BuscadorPlatos({ platos, onSeleccion }: BuscadorPlatosProps) {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [temperamentoFiltro, setTemperamentoFiltro] = useState<string>('');
  const [soloSinVenenos, setSoloSinVenenos] = useState(false);

  const platosFiltrados = useMemo(() => {
    return platos.filter((plato) => {
      // Filtro por texto
      if (textoBusqueda) {
        const texto = textoBusqueda.toLowerCase();
        const coincideNombre = plato.nombre.toLowerCase().includes(texto);
        const coincideDesc = plato.descripcion?.toLowerCase().includes(texto) || false;
        const coincideIngrediente = plato.receta?.ingredientes.some(ri => 
          ri.ingrediente.nombre.toLowerCase().includes(texto)
        ) || false;

        if (!coincideNombre && !coincideDesc && !coincideIngrediente) {
          return false;
        }
      }

      // Filtro por categoría
      if (categoriaFiltro && plato.categoria_id !== categoriaFiltro) {
        return false;
      }

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
  }, [platos, textoBusqueda, categoriaFiltro, temperamentoFiltro, soloSinVenenos]);

  // Notificar al padre cuando cambien los filtros
  useEffect(() => {
    onSeleccion(platosFiltrados);
  }, [platosFiltrados, onSeleccion]);

  const limpiarFiltros = () => {
    setTextoBusqueda('');
    setCategoriaFiltro(null);
    setTemperamentoFiltro('');
    setSoloSinVenenos(false);
  };

  const hayFiltros = textoBusqueda || categoriaFiltro || temperamentoFiltro || soloSinVenenos;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
      {/* Barra de búsqueda */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
            placeholder="🔍 Buscar por nombre, ingrediente..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-semibold"
          >
            ✖️ Limpiar
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
          <select
            value={categoriaFiltro || ''}
            onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todas</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icono} {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">🌿 Temperamento</label>
          <select
            value={temperamentoFiltro}
            onChange={(e) => setTemperamentoFiltro(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos</option>
            {TEMPERAMENTOS.map((temp) => (
              <option key={temp.valor} value={temp.valor}>
                {temp.nombre} - {temp.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">🚫 Filtro Hildegardiano</label>
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={soloSinVenenos}
              onChange={(e) => setSoloSinVenenos(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Solo sin venenos</span>
          </label>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
        <p className="text-gray-600">
          Mostrando <strong>{platosFiltrados.length}</strong> de <strong>{platos.length}</strong> platos
        </p>
        {platosFiltrados.length === 0 && (
          <p className="text-orange-600 font-semibold">
            ⚠️ No hay platos con estos filtros
          </p>
        )}
      </div>
    </div>
  );
}

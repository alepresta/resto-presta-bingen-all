'use client';

import { useState, useEffect } from 'react';

interface Ingrediente {
  id: string;
  nombre: string;
  categoria: string;
  unidad_base: string;
  calorias: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  grasas_g: number | null;
}

interface IngredienteSeleccionado {
  ingrediente_id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface SelectorIngredientesProps {
  value: IngredienteSeleccionado[];
  onChange: (ingredientes: IngredienteSeleccionado[]) => void;
}

export default function SelectorIngredientes({ value, onChange }: SelectorIngredientesProps) {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState<Ingrediente | null>(null);
  const [cantidad, setCantidad] = useState(100);
  const [unidad, setUnidad] = useState('gramos');

  // Cargar ingredientes
  useEffect(() => {
    const cargar = async () => {
      const res = await fetch('/api/admin/ingredientes?categoria=todos');
      const data = await res.json();
      setIngredientes(data.ingredientes || []);
    };
    cargar();
  }, []);

  // Filtrar ingredientes
  const ingredientesFiltrados = ingredientes.filter((ing) => {
    const matchBusqueda = ing.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = categoriaFiltro === 'todos' || ing.categoria === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  // Agregar ingrediente a la receta
  const agregarIngrediente = (ingrediente: Ingrediente, cantidadInicial: number, unidadInicial: string) => {
    const nuevo: IngredienteSeleccionado = {
      ingrediente_id: ingrediente.id,
      nombre: ingrediente.nombre,
      cantidad: cantidadInicial,
      unidad: unidadInicial,
    };

    // Verificar si ya existe
    if (value.some((i) => i.ingrediente_id === nuevo.ingrediente_id)) {
      alert('Este ingrediente ya está en la receta');
      return;
    }

    onChange([...value, nuevo]);
    setIngredienteSeleccionado(null);
    setCantidad(100);
    setUnidad('gramos');
    setBusqueda('');
    setMostrarResultados(false);
  };

  // Eliminar ingrediente
  const eliminarIngrediente = (id: string) => {
    onChange(value.filter((i) => i.ingrediente_id !== id));
  };

  // Actualizar cantidad
  const actualizarCantidad = (id: string, nuevaCantidad: number) => {
    onChange(value.map((i) => (i.ingrediente_id === id ? { ...i, cantidad: nuevaCantidad } : i)));
  };

  const actualizarUnidad = (id: string, nuevaUnidad: string) => {
    onChange(value.map((i) => (i.ingrediente_id === id ? { ...i, unidad: nuevaUnidad } : i)));
  };

  // Calcular nutrición total
  const calcularNutricion = () => {
    let calorias = 0;
    let proteinas = 0;
    let carbs = 0;
    let grasas = 0;

    value.forEach((item) => {
      const ing = ingredientes.find((i) => i.id === item.ingrediente_id);
      if (!ing) return;

      // Calcular factor (cantidad / 100g)
      const factor = item.cantidad / 100;
      calorias += (ing.calorias || 0) * factor;
      proteinas += (ing.proteinas_g || 0) * factor;
      carbs += (ing.carbohidratos_g || 0) * factor;
      grasas += (ing.grasas_g || 0) * factor;
    });

    return { calorias, proteinas, carbs, grasas };
  };

  const nutricion = calcularNutricion();

  const categorias = [
    { id: 'todos', nombre: 'Todas' },
    { id: 'verduras', nombre: '🥕 Verduras' },
    { id: 'frutas', nombre: '🍎 Frutas' },
    { id: 'carnes', nombre: '🥩 Carnes' },
    { id: 'pescados', nombre: '🐟 Pescados' },
    { id: 'lacteos', nombre: '🧀 Lácteos' },
    { id: 'granos', nombre: '🌾 Granos' },
    { id: 'condimentos', nombre: '🧂 Condimentos' },
    { id: 'aceites', nombre: '🫒 Aceites' },
    { id: 'hierbas', nombre: '🌿 Hierbas' },
  ];

  return (
    <div className="space-y-4">
      {/* Buscador de ingredientes */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-3">🔍 Agregar Ingrediente</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setMostrarResultados(true);
            }}
            onFocus={() => setMostrarResultados(true)}
            placeholder="Buscar ingrediente..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setBusqueda(''); setCategoriaFiltro('todos'); }}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Limpiar
          </button>
        </div>

        {/* Resultados de búsqueda */}
        {mostrarResultados && busqueda.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg max-h-60 overflow-y-auto mb-3">
            {ingredientesFiltrados.slice(0, 20).map((ing) => (
              <button
                key={ing.id}
                type="button"
                onClick={() => {
                  const unidadBase = ing.unidad_base || 'gramos';
                  agregarIngrediente(ing, 100, unidadBase);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-green-50 border-b last:border-b-0 text-gray-900 ${
                  ingredienteSeleccionado?.id === ing.id ? 'bg-green-100' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">{ing.nombre}</span>
                  <span className="text-xs text-gray-500">
                    {ing.calorias !== null ? `${ing.calorias} kcal` : 'Sin datos'}
                  </span>
                </div>
              </button>
            ))}
            {ingredientesFiltrados.length === 0 && (
              <p className="px-4 py-3 text-gray-500 text-center">No se encontraron ingredientes</p>
            )}
          </div>
        )}

        {/* Formulario de cantidad */}
        {ingredienteSeleccionado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="font-semibold text-green-800 mb-2">
              ✓ Seleccionado: {ingredienteSeleccionado.nombre}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad</label>
                <select
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="gramos">gramos</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="litros">litros</option>
                  <option value="unidades">unidades</option>
                  <option value="cucharadas">cucharadas</option>
                  <option value="cucharadita">cucharadita</option>
                  <option value="tazas">tazas</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!ingredienteSeleccionado) return;
                agregarIngrediente(ingredienteSeleccionado, cantidad, unidad);
              }}
              className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
            >
              ➕ Agregar a la receta
            </button>
          </div>
        )}
      </div>

      {/* Lista de ingredientes seleccionados */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-3">
          🥕 Ingredientes de la Receta ({value.length})
        </h3>

        {value.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aún no hay ingredientes</p>
        ) : (
          <div className="space-y-2">
            {value.map((item) => (
              <div key={item.ingrediente_id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => actualizarCantidad(item.ingrediente_id, parseFloat(e.target.value) || 0)}
                      step="0.1"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={item.unidad}
                      onChange={(e) => actualizarUnidad(item.ingrediente_id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-600"
                    >
                      <option value="gramos">gramos</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="litros">litros</option>
                      <option value="unidades">unidades</option>
                      <option value="cucharadas">cucharadas</option>
                      <option value="cucharadita">cucharadita</option>
                      <option value="tazas">tazas</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => eliminarIngrediente(item.ingrediente_id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen nutricional */}
      {value.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-bold text-amber-800 mb-3">📊 Nutrición Total de la Receta</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600">🔥 Calorías</p>
              <p className="text-xl font-bold text-amber-600">{nutricion.calorias.toFixed(0)}</p>
              <p className="text-xs text-gray-500">kcal</p>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600">💪 Proteínas</p>
              <p className="text-xl font-bold text-blue-600">{nutricion.proteinas.toFixed(1)}</p>
              <p className="text-xs text-gray-500">g</p>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600">🍞 Carbohidratos</p>
              <p className="text-xl font-bold text-orange-600">{nutricion.carbs.toFixed(1)}</p>
              <p className="text-xs text-gray-500">g</p>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600">🥑 Grasas</p>
              <p className="text-xl font-bold text-yellow-600">{nutricion.grasas.toFixed(1)}</p>
              <p className="text-xs text-gray-500">g</p>
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-2 italic">
            * Valores calculados según las cantidades seleccionadas
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

interface Categoria {
  id: number;
  nombre: string;
  icono: string;
  cantidad: number;
}

interface CategoriaTabsProps {
  categorias: Categoria[];
  categoriaActiva: number;
  onCategoriaChange: (id: number) => void;
}

export default function CategoriaTabs({
  categorias,
  categoriaActiva,
  onCategoriaChange,
}: CategoriaTabsProps) {
  return (
    <div className="bg-white shadow-md sticky top-0 z-10 border-b">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          {categorias.map((categoria) => (
            <button
              key={categoria.id}
              onClick={() => onCategoriaChange(categoria.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                categoriaActiva === categoria.id
                  ? 'bg-amber-500 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {categoria.icono} {categoria.nombre}
              <span className="ml-2 text-xs opacity-75">
                ({categoria.cantidad})
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

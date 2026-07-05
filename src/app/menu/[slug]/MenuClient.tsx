'use client';

import { useState } from 'react';
import PlatoCard from '@/components/PlatoCard';
import CategoriaTabs from '@/components/CategoriaTabs';

interface Restaurante {
  id: string;
  nombre: string;
  tagline?: string;
  logo?: string;
}

interface DiaInfo {
  id: number;
  nombre: string;
  tematica: string;
}

interface Categoria {
  id: number;
  nombre: string;
  icono: string;
  cantidad: number;
  platos: any[];
}

interface MenuClientProps {
  restaurante: Restaurante;
  diaInfo: DiaInfo;
  categorias: Categoria[];
}

export default function MenuClient({
  restaurante,
  diaInfo,
  categorias,
}: MenuClientProps) {
  const [categoriaActiva, setCategoriaActiva] = useState(
    categorias.find((c) => c.cantidad > 0)?.id || categorias[0]?.id || 1
  );

  const categoriaActual = categorias.find((c) => c.id === categoriaActiva);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-serif">
                {restaurante.nombre}
              </h1>
              {restaurante.tagline && (
                <p className="text-lg italic text-amber-100 mt-1">
                  "{restaurante.tagline}"
                </p>
              )}
            </div>
            {restaurante.logo && (
              <img
                src={restaurante.logo}
                alt="Logo"
                className="h-16 w-16 rounded-full bg-white p-1"
              />
            )}
          </div>
        </div>
      </header>

      {/* Banner del día */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hoy es</p>
              <p className="text-2xl font-bold text-gray-800">
                {diaInfo.nombre}
              </p>
              <p className="text-sm text-amber-600 font-semibold">
                {diaInfo.tematica}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Menú del día</p>
              <p className="text-3xl">🍽️</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de categorías */}
      <CategoriaTabs
        categorias={categorias}
        categoriaActiva={categoriaActiva}
        onCategoriaChange={setCategoriaActiva}
      />

      {/* Contenido de la categoría activa */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {categoriaActual && categoriaActual.platos.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {categoriaActual.icono} {categoriaActual.nombre}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {categoriaActual.cantidad} {categoriaActual.cantidad === 1 ? 'opción disponible' : 'opciones disponibles'}
              </p>
            </div>

            <div className="grid gap-4">
              {categoriaActual.platos.map((plato) => (
                <PlatoCard key={plato.id} plato={plato} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-6xl mb-4">🍽️</p>
            <p className="text-xl text-gray-600">
              No hay platos disponibles en esta categoría
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-amber-900 text-amber-100 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="font-serif text-xl mb-2">{restaurante.nombre}</p>
          <p className="italic text-sm">"{restaurante.tagline}"</p>
          <p className="text-xs mt-4 opacity-75">
            Basado en las revelaciones de Santa Hildegarda de Bingen
          </p>
        </div>
      </footer>
    </div>
  );
}

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-br from-amber-700 via-amber-600 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-5xl md:text-6xl font-bold font-serif mb-4">
            RESTO PRESTA BINGEN ALL
          </h1>
          <p className="text-2xl italic text-amber-100 mb-2">
            &ldquo;Comida es Medicina&rdquo;
          </p>
          <p className="text-lg opacity-90 mb-8">
            Cocina hildegardiana • Pedidos anticipados
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/menu/resto-presta-bingen-all" className="btn-primary">
              🍽️ Ver Menú
            </Link>
            <Link href="/pedido" className="btn-secondary">
              📅 Hacer Pedido
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-2">10 Días de Anticipación</h3>
            <p className="text-gray-600">
              Pedidos exclusivos con preparación artesanal y consciente
            </p>
          </div>
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🌾</div>
            <h3 className="text-xl font-bold mb-2">Espelta Sagrada</h3>
            <p className="text-gray-600">
              El grano sagrado de Hildegarda en cada preparación
            </p>
          </div>
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h3 className="text-xl font-bold mb-2">Hierbas Medicinales</h3>
            <p className="text-gray-600">
              Cada plato con propiedades curativas específicas
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-green-50 to-amber-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold font-serif mb-6">Viriditas</h2>
          <p className="text-xl text-gray-700 leading-relaxed">
            La fuerza vital verde que Hildegarda describía como el poder sanador 
            de la naturaleza. Cada plato está preparado con <strong>espelta</strong>, 
            <strong> hierbas medicinales</strong> y <strong>ingredientes de estación</strong> 
            para nutrir cuerpo y alma.
          </p>
        </div>
      </section>

      <footer className="bg-amber-900 text-amber-100 py-8 text-center">
        <p className="font-serif text-xl mb-2">RESTO PRESTA BINGEN ALL</p>
        <p className="italic">&ldquo;Comida es Medicina&rdquo;</p>
        <p className="text-sm mt-4 opacity-75">
          Basado en las revelaciones de Santa Hildegarda de Bingen (1098-1179)
        </p>
      </footer>
    </div>
  );
}

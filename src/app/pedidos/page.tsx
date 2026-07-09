import Link from 'next/link';

export default function PedidosHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            🍽️ Armá tu plan de 30 días en grupo
          </h2>
          <p className="text-lg text-gray-600">
            Reunite con 3 amigos/familiares y elegí juntos qué comer los próximos 30 días
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Crear Grupo */}
          <Link
            href="/pedidos/crear"
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border-2 border-amber-200 hover:border-amber-500 group"
          >
            <div className="text-6xl mb-4">👑</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-amber-700">
              Crear un grupo
            </h3>
            <p className="text-gray-600 mb-4">
              Sos el primero. Creás el grupo, elegís las fechas y compartís la palabra secreta con los otros 3.
            </p>
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-semibold inline-block">
              Comenzar →
            </div>
          </Link>

          {/* Unirse a Grupo */}
          <Link
            href="/pedidos/unirse"
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border-2 border-green-200 hover:border-green-500 group"
          >
            <div className="text-6xl mb-4">🤝</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-green-700">
              Unirse a un grupo
            </h3>
            <p className="text-gray-600 mb-4">
              Ya te invitaron. Ingresá la palabra secreta que te compartieron y empezá a elegir platos.
            </p>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold inline-block">
              Unirme →
            </div>
          </Link>
        </div>

        {/* Info */}
        <div className="mt-12 bg-white rounded-2xl shadow-md p-6 border-l-4 border-amber-500">
          <h3 className="text-xl font-bold text-gray-800 mb-3">📋 ¿Cómo funciona?</h3>
          <ol className="space-y-2 text-gray-700">
            <li><strong>1.</strong> Uno de los 4 crea el grupo y recibe una palabra secreta</li>
            <li><strong>2.</strong> Comparte la palabra por WhatsApp con los otros 3</li>
            <li><strong>3.</strong> Cada uno elige qué comer cada día (desayuno, almuerzo, guarnición, postre, bebida)</li>
            <li><strong>4.</strong> Si dos eligen diferente, gana la mayoría</li>
            <li><strong>5.</strong> Cuando los 4 confirman, el pedido se envía al restaurante</li>
          </ol>
          <div className="mt-4 bg-amber-50 p-3 rounded-lg">
            <p className="text-sm text-amber-800">
              ⏰ <strong>Recordá:</strong> Los pedidos deben hacerse con al menos <strong>10 días de anticipación</strong>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

import Link from 'next/link';

export default function InicioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Volver al menú */}
        <div className="mb-6">
          <Link
            href="/menu/resto-presta-bingen-all"
            className="inline-flex items-center text-blue-700 font-semibold hover:underline"
          >
            ← Volver al menú
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🍽️ Resto Presta Bingen All
          </h1>
          <p className="text-xl text-gray-600">
            Sistema de pedidos grupales para restaurantes
          </p>
        </div>

        {/* Instrucciones */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 ¿Cómo funciona?
          </h2>
          <div className="space-y-4 text-gray-700">
            <div className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3 flex-shrink-0">1</span>
              <p><strong>Crea un grupo de pedido:</strong> Inicia un nuevo pedido grupal y comparte el enlace con tus amigos.</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3 flex-shrink-0">2</span>
              <p><strong>Únete a un grupo:</strong> Si alguien ya creó un pedido, únete usando el código o enlace.</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3 flex-shrink-0">3</span>
              <p><strong>Elige del menú:</strong> Cada persona selecciona lo que quiere pedir del menú del restaurante.</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3 flex-shrink-0">4</span>
              <p><strong>Revisa y confirma:</strong> Ve todos los pedidos del grupo y confirma la orden.</p>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/pedidos/crear"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105 text-center"
          >
            <div className="text-3xl mb-2">🆕</div>
            <div className="text-xl">Crear Nuevo Pedido</div>
            <div className="text-sm mt-2 opacity-90">Inicia un grupo y comparte con amigos</div>
          </Link>

          <Link
            href="/pedidos/unirse"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105 text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <div className="text-xl">Unirse a un Pedido</div>
            <div className="text-sm mt-2 opacity-90">Entra a un grupo existente</div>
          </Link>
        </div>

        {/* Otras opciones */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Otras opciones:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/pedidos"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">📦</span>
              <div>
                <div className="font-semibold text-gray-900">Ver todos los pedidos</div>
                <div className="text-sm text-gray-600">Lista completa de pedidos activos</div>
              </div>
            </Link>

            <Link
              href="/menu/resto-presta-bingen-all"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">🍕</span>
              <div>
                <div className="font-semibold text-gray-900">Ver menú</div>
                <div className="text-sm text-gray-600">Explora el menú del restaurante</div>
              </div>
            </Link>

            <Link
              href="/pedidos/nuevo"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">✨</span>
              <div>
                <div className="font-semibold text-gray-900">Crear pedido (alternativo)</div>
                <div className="text-sm text-gray-600">Otra forma de iniciar un pedido</div>
              </div>
            </Link>

            <Link
              href="/test-db"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mr-3">🔧</span>
              <div>
                <div className="font-semibold text-gray-900">Probar conexión</div>
                <div className="text-sm text-gray-600">Verifica la conexión a la base de datos</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>¿Tienes problemas? Contacta al administrador del sistema</p>
        </div>
      </div>
    </div>
  );
}

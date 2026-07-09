// src/app/admin/page.tsx
import { redirect } from 'next/navigation';
import { getUsuarioConRol } from '@/lib/supabase/server';

export default async function AdminDashboardPage() {
  const usuario = await getUsuarioConRol();

  if (!usuario) {
    redirect('/auth/login?redirect=/admin');
  }

  const session = usuario;
  const soloLectura = usuario.rol === 'lector';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Bienvenido, {session.nombre} 👋
          </h2>
          <p className="text-gray-600">Rol: {session.rol}</p>
          {soloLectura && (
            <div className="mt-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
              👁️ Tu rol es <strong>lector</strong>: podés ver la información pero no crear, editar ni eliminar.
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
            <h3 className="text-gray-600 text-sm font-semibold">PLATOS</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">110</p>
            <p className="text-xs text-green-600 mt-1">✓ Activos</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-gray-600 text-sm font-semibold">RECETAS</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">93</p>
            <p className="text-xs text-amber-600 mt-1">84% cobertura</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <h3 className="text-gray-600 text-sm font-semibold">PEDIDOS</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">0</p>
            <p className="text-xs text-gray-500 mt-1">Sin pedidos activos</p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <h3 className="text-lg font-bold text-gray-800 mb-4">🚀 Accesos rápidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/admin/platos"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-amber-500"
          >
            <div className="text-3xl mb-2">🍽️</div>
            <h3 className="font-bold text-gray-800">Gestionar Platos</h3>
            <p className="text-sm text-gray-600 mt-1">Agregar, editar, eliminar</p>
          </a>

          <a
            href="/admin/recetas"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-green-500"
          >
            <div className="text-3xl mb-2">📖</div>
            <h3 className="font-bold text-gray-800">Gestionar Recetas</h3>
            <p className="text-sm text-gray-600 mt-1">Crear y editar recetas</p>
          </a>

          <a
            href="/admin/ingredientes"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-emerald-500"
          >
            <div className="text-3xl mb-2">🥕</div>
            <h3 className="font-bold text-gray-800">Ingredientes</h3>
            <p className="text-sm text-gray-600 mt-1">Catálogo nutricional</p>
          </a>

          <a
            href="/admin/lista-compras"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-3xl mb-2">🛒</div>
            <h3 className="font-bold text-gray-800">Lista de Compras</h3>
            <p className="text-sm text-gray-600 mt-1">Generar desde pedidos</p>
          </a>

          <a
            href="/admin/analisis-nutricional"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-purple-500"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold text-gray-800">Análisis Nutricional</h3>
            <p className="text-sm text-gray-600 mt-1">Balance del menú</p>
          </a>

          <a
            href="/admin/pedidos"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-indigo-500"
          >
            <div className="text-3xl mb-2">📦</div>
            <h3 className="font-bold text-gray-800">Ver Pedidos</h3>
            <p className="text-sm text-gray-600 mt-1">Gestionar órdenes</p>
          </a>

          <a
            href="/admin/configuracion"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-gray-500"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <h3 className="font-bold text-gray-800">Configuración</h3>
            <p className="text-sm text-gray-600 mt-1">Ajustes del sistema</p>
          </a>
        </div>
      </main>
    </div>
  );
}

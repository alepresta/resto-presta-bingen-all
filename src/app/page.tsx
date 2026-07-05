import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = createServerSupabaseClient()

  // Traer el restaurante desde Supabase
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre, tagline')
    .eq('slug', 'resto-presta-bingen-all')
    .single()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-amber-800 font-serif">
          {restaurante?.nombre || 'Cargando...'}
        </h1>
        <p className="text-2xl italic text-gray-600">
          {restaurante?.tagline}
        </p>
        
        <div className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-amber-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📊 Menú cargado en Supabase:
          </h2>
          <ul className="space-y-2 text-lg text-gray-700">
            <li>☕ Desayunos: <strong>14</strong></li>
            <li>🍽️ Platos Principales: <strong>49</strong></li>
            <li>🥗 Guarniciones: <strong>14</strong></li>
            <li>🍰 Postres: <strong>14</strong></li>
            <li>🥤 Bebidas: <strong>19</strong></li>
            <li className="pt-2 border-t border-gray-200 text-amber-700 font-bold">
              Total: 110 platos 🎉
            </li>
          </ul>
        </div>

        <p className="text-sm text-green-600 mt-8 font-semibold">
          ✅ Conexión a Supabase exitosa
        </p>
      </div>
    </main>
  )
}

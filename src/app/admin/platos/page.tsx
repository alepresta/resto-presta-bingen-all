import { createServerSupabaseClient } from '@/lib/supabase-server';
import ListaPlatos from './ListaPlatos';

export default async function AdminPlatosPage() {
  const supabase = createServerSupabaseClient();

  // PASO 1: Obtener platos básicos (con imagen)
  const { data: platosBasicos, error: errorPlatos } = await supabase
    .from('platos')
    .select('*')
    .eq('disponible', true)
    .order('nombre');

  if (errorPlatos) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          ❌ Error: {errorPlatos.message}
        </div>
      </div>
    );
  }

  // PASO 2: Obtener recetas con ingredientes para cada plato
  const platosConRecetas = await Promise.all(
    (platosBasicos || []).map(async (plato) => {
      const { data: receta } = await supabase
        .from('recetas')
        .select(`
          id,
          ingredientes:receta_ingredientes(
            ingrediente:ingredientes(
              id, nombre, temperamento, es_veneno_hildegardiano, es_base_alegria
            )
          )
        `)
        .eq('plato_id', plato.id)
        .single();

      return {
        ...plato,
        receta: receta || null,
      };
    })
  );

  return <ListaPlatos platos={platosConRecetas} />;
}

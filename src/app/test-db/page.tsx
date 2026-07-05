import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function TestDBPage() {
  const supabase = createServerSupabaseClient();
  
  const { data: restaurantes, error } = await supabase
    .from('restaurantes')
    .select('*');
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test de Base de Datos</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold">Variables de entorno:</h2>
        <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Falta'}</p>
        <p>Service Key: {process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Falta'}</p>
      </div>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold">Resultado de la consulta:</h2>
        {error && <p className="text-red-600">Error: {error.message}</p>}
        <pre className="bg-white p-4 rounded mt-2 overflow-auto">
          {JSON.stringify(restaurantes, null, 2)}
        </pre>
      </div>
    </div>
  );
}

import { createBrowserClient } from '@supabase/ssr';

// Cliente de Supabase para el navegador (componentes cliente).
// Persiste la sesión en cookies para que el servidor también pueda leerla.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente de Supabase para el servidor (Server Components, Route Handlers).
// Lee la sesión desde las cookies. Las escrituras de cookies durante el render
// de un Server Component se ignoran de forma segura (el refresh se hace en el middleware).
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignorado: no se pueden setear cookies durante el render de un RSC.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignorado: no se pueden setear cookies durante el render de un RSC.
          }
        },
      },
    }
  );
}

// Devuelve el usuario autenticado y su rol (desde la tabla profiles), o null.
// Usa getUser() para evitar estados inconsistentes justo después del login.
export async function getUsuarioConRol() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre, telefono')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    nombre: (profile?.nombre as string) ?? user.email ?? '',
    telefono: (profile?.telefono as string) ?? '',
    rol: (profile?.rol as string) ?? 'lector',
  };
}

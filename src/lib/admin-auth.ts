// src/lib/admin-auth.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

// Verificar credenciales
export async function loginAdmin(email: string, password: string): Promise<{
  success: boolean;
  user?: AdminUser;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('verificar_admin', {
      email_input: email,
      password_input: password,
    });

    if (error || !data || data.length === 0) {
      return { success: false, error: 'Email o contraseña incorrectos' };
    }

    const user = data[0] as AdminUser;

    // Guardar sesión en cookie
    const session = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      loginAt: new Date().toISOString(),
    };

    // Actualizar último login
    await supabase
      .from('admin_users')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', user.id);

    return { success: true, user };
  } catch (err) {
    return { success: false, error: 'Error de conexión' };
  }
}

// Obtener admin actual (desde cookie)
export async function getAdminActual(): Promise<AdminUser | null> {
  // En server-side, leer cookie
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin_session');

  if (!sessionCookie) return null;

  try {
    const session = JSON.parse(sessionCookie.value);
    return session as AdminUser;
  } catch {
    return null;
  }
}

// Logout
export async function logoutAdmin() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}

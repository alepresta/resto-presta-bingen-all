import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUsuarioConRol } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Solo un admin puede gestionar usuarios
async function requireAdmin() {
  const usuario = await getUsuarioConRol();
  if (!usuario || usuario.rol !== 'admin') return null;
  return usuario;
}

// GET /api/admin/usuarios - listar todos los usuarios
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, nombre, apellido, email, telefono, rol, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ usuarios: data || [] });
}

// POST /api/admin/usuarios - crear un usuario
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, nombre, apellido, telefono, password, rol } = body;
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const rolFinal = rol === 'admin' ? 'admin' : 'cliente';

    const supabase = createServerSupabaseClient();

    // Crear el usuario en auth (el trigger crea el profile automáticamente)
    const { data: creado, error: errorAuth } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, username, telefono },
    });

    if (errorAuth || !creado?.user) {
      return NextResponse.json({ error: errorAuth?.message || 'Error al crear el usuario' }, { status: 400 });
    }

    // Completar/actualizar el profile con los datos y el rol elegido
    const { error: errorProfile } = await supabase
      .from('profiles')
      .update({
        username: username || null,
        nombre: nombre || email,
        apellido: apellido || null,
        email,
        telefono: telefono || null,
        rol: rolFinal,
      })
      .eq('id', creado.user.id);

    if (errorProfile) {
      return NextResponse.json({ error: errorProfile.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: creado.user.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

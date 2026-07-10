import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/registro - registro público (confirma el email automáticamente)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nombre = body.nombre || '';
    const apellido = body.apellido || '';
    const username = body.username || '';
    const telefono = body.telefono || '';
    const password = body.password || '';
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Crear el usuario ya confirmado (el trigger lo deja con rol 'cliente')
    const { data: creado, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, username, telefono },
    });

    if (error || !creado?.user) {
      const msg = /already been registered|already exists/i.test(error?.message || '')
        ? 'Ya existe una cuenta con ese email'
        : error?.message || 'Error al registrar';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Completar datos del perfil (username/apellido)
    await supabase
      .from('profiles')
      .update({
        username: username || null,
        nombre: nombre || email,
        apellido: apellido || null,
        telefono: telefono || null,
        email,
      })
      .eq('id', creado.user.id);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

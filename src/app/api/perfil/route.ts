import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUsuarioConRol } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/perfil - el usuario autenticado edita su propio perfil (nunca el rol)
export async function PATCH(request: NextRequest) {
  const usuario = await getUsuarioConRol();
  if (!usuario) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username, nombre, apellido, telefono } = body;
    const email = body.email !== undefined ? (body.email || '').trim().toLowerCase() : undefined;

    const supabase = createServerSupabaseClient();

    // Si cambia el email, actualizarlo en auth
    if (email && email !== usuario.email) {
      const { error: errorEmail } = await supabase.auth.admin.updateUserById(usuario.id, { email });
      if (errorEmail) {
        return NextResponse.json({ error: errorEmail.message }, { status: 400 });
      }
    }

    const update: Record<string, any> = {};
    if (username !== undefined) update.username = username || null;
    if (nombre !== undefined) update.nombre = nombre || null;
    if (apellido !== undefined) update.apellido = apellido || null;
    if (telefono !== undefined) update.telefono = telefono || null;
    if (email !== undefined) update.email = email || null;

    const { error } = await supabase.from('profiles').update(update).eq('id', usuario.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

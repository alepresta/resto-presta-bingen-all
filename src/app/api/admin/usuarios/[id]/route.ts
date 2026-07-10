import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUsuarioConRol } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAdmin() {
  const usuario = await getUsuarioConRol();
  if (!usuario || usuario.rol !== 'admin') return null;
  return usuario;
}

// PATCH /api/admin/usuarios/[id] - editar datos y rol
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, nombre, apellido, telefono, rol } = body;
    const email = body.email !== undefined ? (body.email || '').trim().toLowerCase() : undefined;

    const supabase = createServerSupabaseClient();

    // Email actual (para actualizar auth solo si cambió)
    const { data: actual } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', params.id)
      .single();

    if (email && email !== actual?.email) {
      const { error: errorAuth } = await supabase.auth.admin.updateUserById(params.id, { email });
      if (errorAuth) {
        return NextResponse.json({ error: errorAuth.message }, { status: 400 });
      }
    }

    const update: Record<string, any> = {};
    if (username !== undefined) update.username = username || null;
    if (nombre !== undefined) update.nombre = nombre || null;
    if (apellido !== undefined) update.apellido = apellido || null;
    if (email !== undefined) update.email = email || null;
    if (telefono !== undefined) update.telefono = telefono || null;
    if (rol !== undefined) update.rol = rol === 'admin' ? 'admin' : 'cliente';

    const { error } = await supabase.from('profiles').update(update).eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

// DELETE /api/admin/usuarios/[id] - eliminar usuario
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (admin.id === params.id) {
    return NextResponse.json({ error: 'No podés eliminar tu propio usuario' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

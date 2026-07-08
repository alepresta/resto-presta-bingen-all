import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// POST: Crear nuevo grupo
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { fecha_inicio, fecha_fin, palabra_secreta } = body;

  try {
    // Validaciones
    if (!fecha_inicio || !fecha_fin || !palabra_secreta) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    if (new Date(fecha_inicio) > new Date(fecha_fin)) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    // Verificar que no exista otro grupo con la misma palabra secreta
    const { data: existente } = await supabase
      .from('grupos_pedido')
      .select('id')
      .eq('palabra_secreta', palabra_secreta)
      .single();

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un grupo con esa palabra secreta' },
        { status: 400 }
      );
    }

    // Obtener el usuario admin actual (el creador)
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const sessionCookie = cookieStore.get('admin_session');
    
    let creadoPor = '00000000-0000-0000-0000-000000000000'; // fallback
    
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value);
        // Si el admin tiene un cliente asociado, usarlo
        if (session.cliente_id) {
          creadoPor = session.cliente_id;
        }
      } catch (e) {
        console.error('Error parseando sesión:', e);
      }
    }

    // Crear el grupo
    const { data: grupo, error } = await supabase
      .from('grupos_pedido')
      .insert({
        fecha_inicio,
        fecha_fin,
        palabra_secreta,
        estado: 'armando',
        creado_por: creadoPor,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ grupo });
  } catch (error: any) {
    console.error('Error creando grupo:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// GET: Listar todos los grupos
export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data: grupos, error } = await supabase
    .from('grupos_pedido')
    .select(`
      *,
      miembros:grupo_miembros(
        id,
        confirmado_general,
        cliente:clientes(id, nombre, email)
      ),
      items:grupo_items(id)
    `)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ grupos: grupos || [] });
}

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { palabra_secreta, cliente_id, nombre, email } = body;

    if (!palabra_secreta || !cliente_id) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Buscar grupo por palabra secreta
    const { data: grupo, error: errorGrupo } = await supabase
      .from('grupos_pedido')
      .select('*')
      .eq('palabra_secreta', palabra_secreta.toUpperCase())
      .eq('estado', 'armando')
      .single();

    if (errorGrupo || !grupo) {
      return NextResponse.json(
        { error: 'Palabra secreta no válida o grupo ya no está disponible' },
        { status: 404 }
      );
    }

    // Crear cliente si no existe
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', cliente_id)
      .single();

    if (!clienteExistente && nombre && email) {
      await supabase.from('clientes').insert({
        id: cliente_id,
        nombre,
        email,
      });
    }

    // Verificar que no sea ya miembro
    const { data: yaMiembro } = await supabase
      .from('grupo_miembros')
      .select('id')
      .eq('grupo_id', grupo.id)
      .eq('cliente_id', cliente_id)
      .single();

    if (yaMiembro) {
      return NextResponse.json(
        { error: 'Ya sos miembro de este grupo', grupo_id: grupo.id },
        { status: 400 }
      );
    }

    // Agregar como miembro
    const { error: errorMiembro } = await supabase
      .from('grupo_miembros')
      .insert({
        grupo_id: grupo.id,
        cliente_id,
        rol: 'miembro',
        confirmado_general: false,
      });

    if (errorMiembro) {
      if (errorMiembro.message.includes('4 miembros')) {
        return NextResponse.json(
          { error: 'El grupo ya tiene 4 miembros' },
          { status: 400 }
        );
      }
      throw errorMiembro;
    }

    return NextResponse.json({
      mensaje: 'Te uniste al grupo exitosamente',
      grupo_id: grupo.id,
      grupo,
    });
  } catch (error: any) {
    console.error('Error en /api/grupos/unirse:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

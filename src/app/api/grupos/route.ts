import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUsuarioConRol } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// GET /api/grupos - Listar grupos públicos
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: grupos, error } = await supabase
      .from('grupos_pedido')
      .select(`
        *,
        creado_por_cliente:clientes!grupos_pedido_creado_por_fkey(nombre, email),
        miembros:grupo_miembros(
          *,
          cliente:clientes(nombre, email)
        )
      `)
      .eq('estado', 'armando')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ grupos: grupos || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/grupos - Crear nuevo grupo
// ============================================
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioConRol();
    if (!usuario || usuario.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden crear grupos.' },
        { status: 403 }
      );
    }

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    
    const { 
      cliente_id, 
      restaurante_id, 
      fecha_inicio, 
      fecha_fin, 
      nombre_cliente,
      email_cliente 
    } = body;
    
    // Validaciones
    if (!cliente_id || !restaurante_id || !fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Validar 10 días de anticipación
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaInicio = new Date(fecha_inicio);
    const diasDiferencia = Math.ceil((fechaInicio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasDiferencia < 10) {
      return NextResponse.json(
        { error: `La fecha de inicio debe ser al menos 10 días desde hoy. Faltan ${10 - diasDiferencia} días.` },
        { status: 400 }
      );
    }
    
    // Validar máximo 30 días
    const fechaFin = new Date(fecha_fin);
    const diasPlan = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasPlan > 30) {
      return NextResponse.json(
        { error: 'El plan no puede exceder los 30 días' },
        { status: 400 }
      );
    }
    
    // Generar palabra secreta única (6-8 caracteres alfanuméricos)
    const generarPalabra = async (): Promise<string> => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let palabra = '';
      for (let i = 0; i < 6; i++) {
        palabra += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Verificar que no exista
      const { data: existente } = await supabase
        .from('grupos_pedido')
        .select('id')
        .eq('palabra_secreta', palabra)
        .single();
      
      if (existente) return generarPalabra();
      return palabra;
    };
    
    const palabra_secreta = await generarPalabra();
    
    // Crear cliente si no existe
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', cliente_id)
      .single();
    
    if (!clienteExistente && nombre_cliente && email_cliente) {
      await supabase
        .from('clientes')
        .insert({
          id: cliente_id,
          nombre: nombre_cliente,
          email: email_cliente
        });
    }
    
    // Crear grupo
    const { data: grupo, error: errorGrupo } = await supabase
      .from('grupos_pedido')
      .insert({
        palabra_secreta,
        restaurante_id,
        fecha_inicio,
        fecha_fin,
        estado: 'armando',
        creado_por: cliente_id
      })
      .select()
      .single();
    
    if (errorGrupo) throw errorGrupo;
    
    // Agregar al creador como miembro con rol "creador"
    const { error: errorMiembro } = await supabase
      .from('grupo_miembros')
      .insert({
        grupo_id: grupo.id,
        cliente_id,
        rol: 'creador',
        confirmado_general: false
      });
    
    if (errorMiembro) throw errorMiembro;
    
    return NextResponse.json({ 
      grupo,
      mensaje: `Grupo creado exitosamente. Palabra secreta: ${palabra_secreta}`,
      palabra_secreta 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

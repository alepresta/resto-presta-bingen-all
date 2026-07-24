import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { formatFechaLocal, esFechaAnterior } from '@/lib/fechas';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔵 POST /api/grupos/[id]/items - Iniciando');
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    console.log('📦 Body recibido:', body);
    
    const { 
      cliente_id, 
      fecha, 
      tipo_comida, 
      plato_id, 
      cantidad = 1 
    } = body;
    const hoyServidor = formatFechaLocal(new Date());
    
    // Validaciones
    if (!cliente_id || !fecha || !tipo_comida || !plato_id) {
      console.error('❌ Faltan campos obligatorios');
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    if (esFechaAnterior(fecha, hoyServidor)) {
      return NextResponse.json(
        { error: 'No se pueden guardar platos en días anteriores a hoy' },
        { status: 400 }
      );
    }
    
    // Verificar que el cliente existe
    const { data: cliente, error: errorCliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', cliente_id)
      .single();
    
    if (errorCliente || !cliente) {
      console.error('❌ Cliente no encontrado:', cliente_id);
      return NextResponse.json(
        { error: 'Cliente no encontrado. Por favor, iniciá sesión nuevamente.' },
        { status: 400 }
      );
    }
    
    // Obtener precio del plato
    const { data: plato, error: errorPlato } = await supabase
      .from('platos')
      .select('precio')
      .eq('id', plato_id)
      .single();
    
    if (errorPlato || !plato) {
      console.error('❌ Plato no encontrado:', plato_id);
      return NextResponse.json({ error: 'Plato no encontrado' }, { status: 404 });
    }

    // Buscar si ya hay una selección para ese casillero (día + comida)
    const { data: existente } = await supabase
      .from('grupo_items')
      .select('id, plato_id, votos')
      .eq('grupo_id', params.id)
      .eq('fecha', fecha)
      .eq('tipo_comida', tipo_comida)
      .maybeSingle();

    // Acuerdo por votos:
    // - Si se elige el MISMO plato que ya estaba, el cliente se suma a los "de acuerdo".
    // - Si se elige un plato DISTINTO (o el casillero estaba vacío), reemplaza y los votos se reinician.
    let votos: string[] = [cliente_id];
    if (existente && existente.plato_id === plato_id) {
      const previos: string[] = Array.isArray(existente.votos) ? existente.votos : [];
      votos = Array.from(new Set([...previos, cliente_id]));
    }

    console.log('🔄 Intentando upsert en grupo_items...');

    // Upsert: insertar o actualizar si ya existe
    const { data: item, error } = await supabase
      .from('grupo_items')
      .upsert({
        grupo_id: params.id,
        fecha,
        tipo_comida,
        plato_id,
        cantidad,
        seleccionado_por: cliente_id,
        modificado_por: cliente_id,
        votos,
      }, {
        onConflict: 'grupo_id,fecha,tipo_comida'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error en upsert:', error);
      throw error;
    }
    
    console.log('✅ Item creado/actualizado:', item);
    
    return NextResponse.json({ 
      item,
      mensaje: 'Plato seleccionado exitosamente' 
    });
  } catch (error: any) {
    console.error('❌ Error general en POST /api/grupos/[id]/items:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');
    
    if (!item_id) {
      return NextResponse.json({ error: 'Falta item_id' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('grupo_items')
      .delete()
      .eq('id', item_id)
      .eq('grupo_id', params.id);
    
    if (error) throw error;
    
    return NextResponse.json({ mensaje: 'Selección eliminada' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

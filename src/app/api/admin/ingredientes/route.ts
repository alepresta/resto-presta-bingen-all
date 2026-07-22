import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');
  const q = searchParams.get('q');
  const vista = searchParams.get('vista');
  const incluirInactivos = ['1', 'true', 'si', 'yes'].includes(
    (searchParams.get('incluir_inactivos') || '').toLowerCase()
  );

  const columnas =
    vista === 'selector'
      ? 'id,nombre,categoria,unidad_base,calorias,proteinas_g,carbohidratos_g,grasas_g,activo,' +
        'temperamento,nivel_subtilitat,es_veneno_hildegardiano,es_base_alegria,requiere_coccion,' +
        'impacto_livor,viriditas_index,humor_principal,frecuencia_recomendada,apto_para_enfermos,' +
        'impacto_bilis_negra,estacion_ideal,beneficios_hildegardianos,contraindicaciones'
      : '*';

  const construirQuery = () => {
    let query = supabase
      .from('ingredientes')
      .select(columnas)
      .order('nombre');

    if (!incluirInactivos) query = query.eq('activo', true);
    if (categoria && categoria !== 'todos') query = query.eq('categoria', categoria);
    if (q) query = query.ilike('nombre', `%${q}%`);

    return query;
  };

  const PAGE_SIZE = 1000;
  const ingredientes: any[] = [];

  for (let desde = 0; ; desde += PAGE_SIZE) {
    const hasta = desde + PAGE_SIZE - 1;
    const { data, error } = await construirQuery().range(desde, hasta);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pagina = data || [];
    ingredientes.push(...pagina);

    if (pagina.length < PAGE_SIZE) break;
  }

  return NextResponse.json({ ingredientes });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('ingredientes')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ingrediente: data });
}

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');
  const q = searchParams.get('q');

  let query = supabase
    .from('ingredientes')
    .select('*')
    .eq('activo', true)
    .order('nombre');

  if (categoria && categoria !== 'todos') query = query.eq('categoria', categoria);
  if (q) query = query.ilike('nombre', `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ingredientes: data || [] });
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

// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.rpc('verificar_admin', {
      email_input: email,
      password_input: password,
    });

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const user = data[0];

    // Crear sesión
    const session = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      loginAt: new Date().toISOString(),
    };

    // Actualizar último login
    await supabase
      .from('admin_users')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', user.id);

    // Crear response con cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    });

    // Set cookie segura
    response.cookies.set('admin_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error interno' },
      { status: 500 }
    );
  }
}

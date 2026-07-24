// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Vista inicial pública para clientes
const MENU_INICIAL = '/menu/resto-presta-bingen-all';
const CLIENT_CACHE_VERSION = '2026-07-24-2';

// Construye una URL absoluta respetando el host público (proxy de Codespaces, etc.)
function construirUrl(request: NextRequest, pathname: string): URL {
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.host;
  const proto =
    request.headers.get('x-forwarded-proto') ??
    request.nextUrl.protocol.replace(':', '');
  const url = new URL(`${proto}://${host}`);
  url.pathname = pathname;
  return url;
}

// Solo el área de administración requiere sesión
function requiereSesion(pathname: string): boolean {
  // Panel admin y APIs de admin quedan protegidos
  return pathname.startsWith('/admin') || (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/recetas'));
}

function esVistaCliente(pathname: string): boolean {
  return pathname.startsWith('/menu') || pathname.startsWith('/pedidos');
}

function aplicarNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  // Pide limpiar cache HTTP del navegador para evitar respuestas viejas en PWA instalada.
  response.headers.set('Clear-Site-Data', '"cache"');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cache-buster de emergencia para vistas cliente: obliga URL versionada.
  if (esVistaCliente(pathname) && request.method === 'GET') {
    const versionActual = request.nextUrl.searchParams.get('cv');
    if (versionActual !== CLIENT_CACHE_VERSION) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.searchParams.set('cv', CLIENT_CACHE_VERSION);
      return NextResponse.redirect(nextUrl);
    }
  }

  // La raíz lleva al menú público (vista inicial de clientes)
  if (pathname === '/') {
    return NextResponse.redirect(construirUrl(request, MENU_INICIAL));
  }

  const esAdmin = requiereSesion(pathname);
  // Todo el flujo de pedidos requiere estar logueado o registrado
  const esPedidos = pathname.startsWith('/pedidos');

  // Rutas totalmente públicas: no requieren sesión.
  if (!esAdmin && !esPedidos) {
    if (esVistaCliente(pathname)) {
      return aplicarNoStore(NextResponse.next());
    }
    return NextResponse.next();
  }

  // Validar la sesión de Supabase (una llamada de red)
  const { response, supabase, user } = await updateSession(request);

  // Requiere sesión (cualquier usuario autenticado)
  if (!user) {
    const loginUrl = construirUrl(request, '/auth/login');
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Para /pedidos alcanza con estar autenticado (sin rol especial)
  if (esPedidos && !esAdmin) {
    return aplicarNoStore(response);
  }

  // Verificar rol del usuario (área de administración)
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  const rol = profile?.rol;

  if (rol !== 'admin' && rol !== 'lector') {
    // Usuario autenticado pero sin rol válido: fuera del panel
    return NextResponse.redirect(construirUrl(request, MENU_INICIAL));
  }

  // Lector = solo lectura: bloquear mutaciones en las APIs de admin
  if (
    rol === 'lector' &&
    pathname.startsWith('/api/admin') &&
    request.method !== 'GET'
  ) {
    return NextResponse.json(
      { error: 'Tu rol es de solo lectura' },
      { status: 403 }
    );
  }

  return response;
}

export const config = {
  // El middleware corre en la raíz, el área protegida y el flujo de pedidos.
  matcher: ['/', '/admin/:path*', '/api/admin/:path*', '/pedidos/:path*', '/menu/:path*'],
};

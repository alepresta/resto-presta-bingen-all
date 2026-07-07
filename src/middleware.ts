// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rutas que requieren autenticación
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Permitir acceso al login
    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }

    // Verificar cookie de sesión
    const session = request.cookies.get('admin_session');

    if (!session) {
      // Redirigir al login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const sessionData = JSON.parse(session.value);
      // Verificar que la sesión no esté expirada (8 horas)
      const loginTime = new Date(sessionData.loginAt).getTime();
      const now = Date.now();
      const hoursPassed = (now - loginTime) / (1000 * 60 * 60);

      if (hoursPassed > 8) {
        const response = NextResponse.redirect(new URL('/admin/login', request.url));
        response.cookies.delete('admin_session');
        return response;
      }
    } catch {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

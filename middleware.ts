import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não exigem sessão
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname === '/robots.txt'
  ) {
    // Se já estiver logado e tentar acessar /login, redireciona para /novo
    if (pathname === '/login') {
      const session = request.cookies.get('auth_session')?.value;
      if (session) {
        return NextResponse.redirect(new URL('/novo', request.url));
      }
    }
    return NextResponse.next();
  }

  // Verifica se há cookie de sessão
  const session = request.cookies.get('auth_session')?.value;
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se rota raiz "/", redireciona para "/novo"
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/novo', request.url));
  }

  const response = NextResponse.next();

  // Cabeçalhos de segurança HTTP estritos
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

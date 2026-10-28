import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas internas do Next.js e assets estáticos que não devem ser interceptados
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  let hasSession = false;

  // 1. Verifica se há cookies do Supabase SSR ou de sessão
  const allCookies = request.cookies.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.startsWith('sb-') || c.name === 'auth_session' || c.name === 'sb_session'
  );

  if (authCookie && authCookie.value) {
    // Se temos credenciais reais de Supabase configuradas
    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        });

        const { data: { user } } = await supabase.auth.getUser();
        hasSession = !!user;
      } catch {
        hasSession = true;
      }
    } else {
      // Modo local / teste
      hasSession = true;
    }
  }

  // Se for a rota /login
  if (pathname === '/login') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // Rotas de API públicas de autenticação (como /api/auth/login)
  if (pathname.startsWith('/api/auth/')) {
    return response;
  }

  // Toda outra rota exige sessão: sem sessão, redireciona para /login
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cabeçalhos de segurança HTTP
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas internas do Next.js e assets estáticos que não devem ser interceptados
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname === '/robots.txt' ||
    pathname === '/logo-jf.webp'
  ) {
    return NextResponse.next();
  }

  const proto = request.headers.get('x-forwarded-proto');
  const isHttps = proto === 'https' || request.nextUrl.protocol === 'https:';

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseConfigured = Boolean(
    supabaseUrl &&
      supabaseKey &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseKey.includes('placeholder')
  );

  let hasSession = false;
  const allCookies = request.cookies.getAll();

  if (supabaseConfigured) {
    const hasSupabaseCookie = allCookies.some(
      (c) => (c.name.startsWith('sb-') || c.name === 'sb_session') && Boolean(c.value)
    );

    if (hasSupabaseCookie) {
      try {
        const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
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
                response.cookies.set(name, value, {
                  ...options,
                  secure: isHttps ? true : options?.secure,
                  sameSite: isHttps ? 'none' : options?.sameSite,
                  ...(isHttps ? { partitioned: true } : {}),
                  path: '/',
                })
              );
            },
          },
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();
        hasSession = !!user;
      } catch {
        hasSession = false;
      }
    }
  } else {
    // Modo local / teste sem Supabase externo configurado
    const localAuthCookie = allCookies.find(
      (c) =>
        (c.name.startsWith('sb-') || c.name === 'auth_session' || c.name === 'sb_session') &&
        Boolean(c.value)
    );
    hasSession = Boolean(localAuthCookie);
  }

  // Se for a rota /login
  if (pathname === '/login') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // Rotas de API públicas de autenticação (como /api/auth/login e /api/auth/signup)
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
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

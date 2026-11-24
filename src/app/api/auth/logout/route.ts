import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionProfile,
  getSupabasePublicKey,
  isSupabaseConfigured,
} from '@/src/lib/supabase/server';

export async function POST(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto');
  const origin = req.headers.get('origin');
  const isHttps =
    proto === 'https' ||
    req.nextUrl.protocol === 'https:' ||
    Boolean(origin?.startsWith('https://'));

  const cookieFlags = {
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    ...(isHttps ? { partitioned: true } : {}),
  };

  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];

  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = getSupabasePublicKey()!;
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => pendingCookies.push(c));
          },
        },
      });
      await supabase.auth.signOut();
    } catch {
      // Ignora erro de signOut remoto
    }
  }

  const response = NextResponse.json({ ok: true });

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, {
      ...options,
      ...cookieFlags,
      path: '/',
    });
  }

  response.cookies.set('auth_session', '', {
    httpOnly: true,
    ...cookieFlags,
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ usuario: null }, { status: 401 });
  }

  return NextResponse.json({ usuario: profile });
}

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { dataStore, verifyPassword } from '@/src/lib/supabase/store';
import { getSupabasePublicKey, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { logSeguro } from '@/src/lib/logs/seguro';

function getCookieSecurityFlags(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto');
  const origin = req.headers.get('origin');
  const isHttps =
    proto === 'https' ||
    req.nextUrl.protocol === 'https:' ||
    Boolean(origin?.startsWith('https://'));
  return {
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    ...(isHttps ? { partitioned: true } : {}),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { erro: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    const emailNorm = String(email).trim().toLowerCase();
    const cookieFlags = getCookieSecurityFlags(req);

    // 1. Quando Supabase está configurado, autentica via Supabase Auth (@supabase/ssr)
    if (isSupabaseConfigured()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = getSupabasePublicKey()!;

      const pendingCookies: Array<{
        name: string;
        value: string;
        options?: Record<string, unknown>;
      }> = [];

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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password: String(password),
      });

      if (error || !data.user) {
        const msg = error?.message?.toLowerCase() || '';
        const naoConfirmado = msg.includes('email not confirmed');
        logSeguro('login_falha', {
          erro: naoConfirmado ? 'E-mail pendente de confirmação' : 'Tentativa de autenticação com dados inválidos',
        });
        return NextResponse.json(
          {
            erro: naoConfirmado
              ? 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou desative a confirmação de e-mail no Supabase Auth.'
              : 'Credenciais inválidas. Verifique seu e-mail e senha.',
          },
          { status: 401 }
        );
      }

      const extProfile = await supabase
        .from('profiles')
        .select('id, name, role, ativo')
        .eq('id', data.user.id)
        .single();

      const profile = !extProfile.error
        ? extProfile.data
        : (
            await supabase
              .from('profiles')
              .select('id, name, role')
              .eq('id', data.user.id)
              .single()
          ).data;

      const localOverride = dataStore.profiles.get(data.user.id);
      if (
        (profile && 'ativo' in profile && profile.ativo === false) ||
        localOverride?.ativo === false
      ) {
        await supabase.auth.signOut();
        return NextResponse.json(
          { erro: 'Seu acesso foi desativado pelo administrador do escritório.' },
          { status: 403 }
        );
      }

      try {
        await supabase.from('user_sessions').insert({ user_id: data.user.id });
        await supabase
          .from('profiles')
          .update({ email: data.user.email || emailNorm })
          .eq('id', data.user.id);
      } catch {
        // Ignora caso a migração 0006 ainda não tenha sido aplicada no banco
      }

      const usuario = {
        id: data.user.id,
        name: profile?.name || data.user.user_metadata?.name || emailNorm.split('@')[0],
        email: data.user.email || emailNorm,
        role: (profile?.role || data.user.user_metadata?.role || 'user') as 'user' | 'admin',
      };

      logSeguro('login_sucesso', { userId: usuario.id });

      const response = NextResponse.json({ ok: true, usuario });
      for (const { name, value, options } of pendingCookies) {
        response.cookies.set(name, value, {
          ...options,
          ...cookieFlags,
          path: '/',
        });
      }
      return response;
    }

    // 2. Modo local / preview sem variáveis Supabase configuradas
    const profile = Array.from(dataStore.profiles.values()).find(
      (p) => p.email.toLowerCase() === emailNorm
    );
    const storedHash = dataStore.localCredentials.get(emailNorm);

    // Mensagem estritamente genérica para não revelar se o e-mail existe
    if (!profile || !storedHash || !verifyPassword(String(password), storedHash)) {
      logSeguro('login_falha', { erro: 'Tentativa de autenticação com dados inválidos' });
      return NextResponse.json(
        { erro: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    if (profile.ativo === false) {
      return NextResponse.json(
        { erro: 'Seu acesso foi desativado pelo administrador do escritório.' },
        { status: 403 }
      );
    }

    const sessionToken = dataStore.createSession(profile.id);
    logSeguro('login_sucesso', { userId: profile.id });

    const response = NextResponse.json({
      ok: true,
      usuario: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
      },
    });

    response.cookies.set('auth_session', sessionToken, {
      httpOnly: true,
      ...cookieFlags,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    logSeguro('login_erro_inesperado', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Ocorreu um erro ao processar a autenticação.' },
      { status: 500 }
    );
  }
}

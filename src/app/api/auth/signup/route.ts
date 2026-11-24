import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { dataStore, hashPassword } from '@/src/lib/supabase/store';
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
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { erro: 'Corpo da requisição inválido.' },
        { status: 400 }
      );
    }

    const nameTrim = typeof body.name === 'string' ? body.name.trim() : '';
    const emailNorm = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const passwordStr = typeof body.password === 'string' ? body.password : '';

    if (nameTrim.length < 2) {
      return NextResponse.json(
        { erro: 'Informe seu nome completo (mínimo de 2 caracteres).' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json(
        { erro: 'Informe um endereço de e-mail válido.' },
        { status: 400 }
      );
    }

    if (passwordStr.length < 6) {
      return NextResponse.json(
        { erro: 'A senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    // Novos cadastros sempre recebem papel padrão 'user', ignorando qualquer role enviado no payload
    const role = 'user' as const;
    const cookieFlags = getCookieSecurityFlags(req);

    // 1. Quando Supabase está configurado, cria conta via Supabase Auth (@supabase/ssr)
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

      const { data, error } = await supabase.auth.signUp({
        email: emailNorm,
        password: passwordStr,
        options: {
          data: {
            name: nameTrim,
            role,
          },
        },
      });

      if (error || !data.user) {
        const msg = error?.message?.toLowerCase() || '';
        const isDuplicate =
          msg.includes('already') ||
          msg.includes('registered') ||
          error?.status === 422;
        const isDisabled = msg.includes('signups not allowed');
        const isRateLimit = msg.includes('rate limit') || error?.status === 429;
        const isDbTriggerError = msg.includes('database error saving new user');

        logSeguro('signup_falha', {
          erro: isDuplicate
            ? 'E-mail já cadastrado'
            : isDbTriggerError
              ? 'Erro de trigger ao salvar perfil no Supabase'
              : 'Falha ao criar conta',
        });

        if (isDuplicate) {
          return NextResponse.json(
            { erro: 'Já existe uma conta cadastrada com este e-mail.' },
            { status: 409 }
          );
        }

        if (isDisabled) {
          return NextResponse.json(
            { erro: 'O cadastro de novos usuários está desativado nas configurações do Supabase Auth.' },
            { status: 403 }
          );
        }

        if (isRateLimit) {
          return NextResponse.json(
            { erro: 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.' },
            { status: 429 }
          );
        }

        if (isDbTriggerError) {
          return NextResponse.json(
            { erro: 'Erro ao criar perfil no banco de dados. Verifique se as migrações SQL do Supabase foram aplicadas.' },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { erro: 'Não foi possível concluir o cadastro. Verifique os dados informados.' },
          { status: 400 }
        );
      }

      if (!data.session) {
        logSeguro('signup_pendente_confirmacao', { userId: data.user.id });
        const response = NextResponse.json(
          {
            ok: true,
            confirmaEmail: true,
            mensagem:
              'Conta registrada no Supabase! Confirme o e-mail enviado para você (ou desative "Confirm email" em Authentication no painel do Supabase) antes de entrar.',
            usuario: {
              id: data.user.id,
              name: nameTrim,
              email: emailNorm,
              role,
            },
          },
          { status: 201 }
        );
        for (const { name, value, options } of pendingCookies) {
          response.cookies.set(name, value, {
            ...options,
            ...cookieFlags,
            path: '/',
          });
        }
        return response;
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

      logSeguro('signup_sucesso', { userId: data.user.id });

      const response = NextResponse.json(
        {
          ok: true,
          usuario: {
            id: data.user.id,
            name: nameTrim,
            email: data.user.email || emailNorm,
            role,
          },
        },
        { status: 201 }
      );
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
    const existente = Array.from(dataStore.profiles.values()).find(
      (p) => p.email.toLowerCase() === emailNorm
    );

    if (existente) {
      logSeguro('signup_falha', { erro: 'Tentativa de cadastro com e-mail já existente' });
      return NextResponse.json(
        { erro: 'Já existe uma conta cadastrada com este e-mail.' },
        { status: 409 }
      );
    }

    const id = crypto.randomUUID();
    const novoPerfil = {
      id,
      name: nameTrim,
      email: emailNorm,
      role,
      created_at: new Date().toISOString(),
    };

    dataStore.profiles.set(id, novoPerfil);
    dataStore.localCredentials.set(emailNorm, hashPassword(passwordStr));
    const sessionToken = dataStore.createSession(id);

    logSeguro('signup_sucesso', { userId: id });

    const response = NextResponse.json(
      {
        ok: true,
        usuario: {
          id: novoPerfil.id,
          name: novoPerfil.name,
          email: novoPerfil.email,
          role: novoPerfil.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set('auth_session', sessionToken, {
      httpOnly: true,
      ...cookieFlags,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    logSeguro('signup_erro_inesperado', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Ocorreu um erro ao processar o cadastro.' },
      { status: 500 }
    );
  }
}

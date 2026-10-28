import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_PROFILES } from '@/src/lib/supabase/store';
import { logSeguro } from '@/src/lib/logs/seguro';

// Senhas seguras iniciais para os 3 usuários provisionados pelo administrador
const SENHAS_USUARIOS: Record<string, string> = {
  'amanda@escritorio.adv.br': 'Admin@2026!',
  'carlos@escritorio.adv.br': 'Carlos@2026!',
  'bruna@escritorio.adv.br': 'Bruna@2026!',
};

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
    const profile = INITIAL_PROFILES.find((p) => p.email.toLowerCase() === emailNorm);
    const senhaEsperada = SENHAS_USUARIOS[emailNorm];

    // Mensagem estritamente genérica para não revelar se o e-mail existe
    if (!profile || !senhaEsperada || password !== senhaEsperada) {
      logSeguro('login_falha', { erro: 'Tentativa de autenticação com dados inválidos' });
      return NextResponse.json(
        { erro: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

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

    // Cookie de sessão seguro
    response.cookies.set('auth_session', profile.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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

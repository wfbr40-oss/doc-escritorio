import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type ProfileRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: ProfileRole;
}

let testSessionProfile: UserProfile | null | undefined = undefined;

/**
 * Permite injetar perfil em testes de unidade sem chamadas externas.
 */
export function setTestSessionProfile(profile: UserProfile | null | undefined) {
  testSessionProfile = profile;
}

/**
 * Cria cliente Supabase para o lado do servidor usando @supabase/ssr
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Invocado a partir de Server Component de leitura
        }
      },
    },
  });
}

/**
 * Retorna o perfil do usuário ativo na sessão: { id, name, role }.
 * Retorna null se não houver usuário autenticado.
 */
export async function getSessionProfile(): Promise<UserProfile | null> {
  if (testSessionProfile !== undefined) {
    return testSessionProfile;
  }

  try {
    const cookieStore = await cookies();
    // Se não há cookies de autenticação salvos
    const allCookies = cookieStore.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.startsWith('sb-') || c.name === 'sb_session' || c.name === 'auth_session'
    );

    if (!hasAuthCookie) {
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário';
      const role = (user.user_metadata?.role as ProfileRole) || 'user';
      return {
        id: user.id,
        name,
        role: role === 'admin' ? 'admin' : 'user',
      };
    }

    return {
      id: profile.id,
      name: profile.name,
      role: profile.role as ProfileRole,
    };
  } catch {
    return null;
  }
}

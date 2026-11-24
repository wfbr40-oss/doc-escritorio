import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { dataStore, INITIAL_PROFILES } from './store';

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
 * Retorna a chave pública do Supabase (publishable key ou anon key legada).
 */
export function getSupabasePublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Indica se as variáveis reais do Supabase estão configuradas no ambiente.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();
  return Boolean(
    url &&
      key &&
      !url.includes('placeholder') &&
      !key.includes('placeholder')
  );
}

/**
 * Cria cliente Supabase para o lado do servidor usando @supabase/ssr
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = getSupabasePublicKey() || 'placeholder-anon-key';

  return createServerClient(supabaseUrl, supabaseKey, {
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
    const allCookies = cookieStore.getAll();

    // Modo local/homologado sem variáveis de Supabase configuradas
    if (!isSupabaseConfigured()) {
      const sessionCookie = cookieStore.get('auth_session')?.value;
      if (!sessionCookie) {
        return null;
      }

      const localProfile =
        dataStore.profiles.get(sessionCookie) ||
        INITIAL_PROFILES.find((p) => p.id === sessionCookie || p.email === sessionCookie);

      if (!localProfile) {
        return null;
      }

      return {
        id: localProfile.id,
        name: localProfile.name,
        role: localProfile.role,
      };
    }

    // Modo Supabase Auth (@supabase/ssr)
    const hasSupabaseCookie = allCookies.some((c) => c.name.startsWith('sb-'));
    if (!hasSupabaseCookie) {
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

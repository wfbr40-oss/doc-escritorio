import { cookies } from 'next/headers';
import { dataStore, INITIAL_PROFILES } from './store';

export interface UserSessionProfile {
  id: string;
  name: string;
  role: 'user' | 'admin';
  email?: string;
}

let testSessionOverride: UserSessionProfile | null | undefined = undefined;

/**
 * Permite definir uma sessão de teste diretamente (usado em suites de testes Vitest).
 */
export function setTestSession(profile: UserSessionProfile | null | undefined) {
  testSessionOverride = profile;
}

/**
 * Retorna o perfil da sessão ativa no servidor.
 * Retorna null se não houver sessão válida.
 */
export async function getSessionProfile(): Promise<UserSessionProfile | null> {
  if (testSessionOverride !== undefined) {
    return testSessionOverride;
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session')?.value;
    if (!sessionCookie) {
      return null;
    }

    // Procura no dataStore ou perfis iniciais
    const profile = dataStore.profiles.get(sessionCookie) ||
      INITIAL_PROFILES.find((p) => p.id === sessionCookie || p.email === sessionCookie);

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      email: profile.email,
    };
  } catch {
    // Caso de execução fora de request context Next.js
    return null;
  }
}

import { getSessionProfile as getServerSessionProfile } from './server';

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
 * Retorna o perfil da sessão ativa no servidor (Supabase Auth ou sessão local).
 * Retorna null se não houver sessão válida.
 */
export async function getSessionProfile(): Promise<UserSessionProfile | null> {
  if (testSessionOverride !== undefined) {
    return testSessionOverride;
  }

  return getServerSessionProfile();
}

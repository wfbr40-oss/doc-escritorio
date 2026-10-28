import { describe, it, expect, beforeEach } from 'vitest';
import { getSessionProfile, setTestSessionProfile } from '../src/lib/supabase/server';
import { middleware } from '../middleware';
import { POST as signupHandler } from '../src/app/api/auth/signup/route';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { NextRequest } from 'next/server';

describe('Tarefa 1: base do projeto, login e perfis', () => {
  beforeEach(() => {
    setTestSessionProfile(undefined);
  });

  it('rota /novo sem sessão redireciona para /login', async () => {
    const req = new NextRequest('http://localhost:3000/novo');
    const res = await middleware(req);

    // Status de redirecionamento do Next.js (307 Temporary Redirect ou 302 Found)
    expect([302, 307]).toContain(res.status);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fnovo');
  });

  it('getSessionProfile() retorna null sem sessão', async () => {
    setTestSessionProfile(null);
    const profile = await getSessionProfile();
    expect(profile).toBeNull();
  });

  it('getSessionProfile() retorna o perfil quando configurado na sessão', async () => {
    setTestSessionProfile({
      id: 'user-amanda-admin',
      name: 'Dra. Amanda Oliveira',
      role: 'admin',
    });

    const profile = await getSessionProfile();
    expect(profile).not.toBeNull();
    expect(profile?.role).toBe('admin');
    expect(profile?.name).toBe('Dra. Amanda Oliveira');
    expect(profile?.id).toBe('user-amanda-admin');
  });

  it('cadastro público é estritamente recusado (status 403)', async () => {
    const res = await signupHandler();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.codigo).toBe('SIGNUP_DESATIVADO');
  });

  it('login recusa credenciais incorretas com mensagem genérica (não vaza se o email existe)', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'inexistente@escritorio.adv.br', password: 'wrong' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.erro).toBe('Credenciais inválidas. Verifique seu e-mail e senha.');
  });
});

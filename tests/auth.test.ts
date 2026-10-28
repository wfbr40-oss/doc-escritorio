import { describe, it, expect, beforeEach } from 'vitest';
import { getSessionProfile, setTestSession } from '../src/lib/supabase/session';
import { POST as signupHandler } from '../src/app/api/auth/signup/route';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { NextRequest } from 'next/server';

describe('Autenticação e Perfis (Tarefa 1)', () => {
  beforeEach(() => {
    setTestSession(undefined);
  });

  it('getSessionProfile() retorna null sem sessão ativa', async () => {
    setTestSession(null);
    const profile = await getSessionProfile();
    expect(profile).toBeNull();
  });

  it('getSessionProfile() retorna o perfil correto com role user ou admin', async () => {
    setTestSession({
      id: 'user-amanda-admin',
      name: 'Dra. Amanda Oliveira',
      role: 'admin',
      email: 'amanda@escritorio.adv.br',
    });

    const profile = await getSessionProfile();
    expect(profile).not.toBeNull();
    expect(profile?.role).toBe('admin');
    expect(profile?.name).toBe('Dra. Amanda Oliveira');
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

  it('login autentica usuário com credenciais corretas e define cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'amanda@escritorio.adv.br', password: 'Admin@2026!' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.usuario.role).toBe('admin');
    expect(res.cookies.get('auth_session')?.value).toBe('user-amanda-admin');
  });
});

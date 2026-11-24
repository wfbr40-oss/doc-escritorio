import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSessionProfile,
  isSupabaseConfigured,
  setTestSessionProfile,
} from '../src/lib/supabase/server';
import { dataStore } from '../src/lib/supabase/store';
import { middleware } from '../middleware';
import { POST as signupHandler } from '../src/app/api/auth/signup/route';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { NextRequest } from 'next/server';

describe('Tarefa 1: base do projeto, login, cadastro e perfis', () => {
  beforeEach(() => {
    setTestSessionProfile(undefined);
    dataStore.reset();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('isSupabaseConfigured() reconhece NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', () => {
    expect(isSupabaseConfigured()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://exemplo.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste');
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('cadastro cria nova conta com role user mesmo se payload enviar admin, define cookie de sessão e permite login subsequente', async () => {
    const signupReq = new NextRequest('https://ais-dev.run.app/api/auth/signup', {
      method: 'POST',
      headers: { 'x-forwarded-proto': 'https' },
      body: JSON.stringify({
        name: 'Dra. Mariana Ferreira',
        email: 'Mariana@Escritorio.adv.br',
        password: 'SenhaForte@2026',
        role: 'admin',
      }),
    });

    const signupRes = await signupHandler(signupReq);
    expect(signupRes.status).toBe(201);

    const signupJson = await signupRes.json();
    expect(signupJson.ok).toBe(true);
    expect(signupJson.usuario.role).toBe('user');
    expect(signupJson.usuario.email).toBe('mariana@escritorio.adv.br');
    expect(signupJson.usuario.name).toBe('Dra. Mariana Ferreira');

    const cookie = signupRes.cookies.get('auth_session');
    expect(cookie?.value).toBe(signupJson.usuario.id);
    expect(cookie?.sameSite).toBe('none');
    expect(cookie?.secure).toBe(true);
    expect(cookie?.partitioned).toBe(true);

    // Login subsequente com a conta recém-criada
    const loginReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'mariana@escritorio.adv.br',
        password: 'SenhaForte@2026',
      }),
    });
    const loginRes = await loginHandler(loginReq);
    expect(loginRes.status).toBe(200);
    const loginJson = await loginRes.json();
    expect(loginJson.usuario.id).toBe(signupJson.usuario.id);
    expect(loginJson.usuario.role).toBe('user');
  });

  it('cadastro recusa e-mail duplicado (status 409) e senha menor que 6 caracteres (status 400)', async () => {
    const shortPassReq = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Teste Curto',
        email: 'novo@escritorio.adv.br',
        password: '123',
      }),
    });
    const shortPassRes = await signupHandler(shortPassReq);
    expect(shortPassRes.status).toBe(400);

    const duplicateReq = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Amanda Duplicada',
        email: 'amanda@escritorio.adv.br',
        password: 'OutraSenha@2026',
      }),
    });
    const duplicateRes = await signupHandler(duplicateReq);
    expect(duplicateRes.status).toBe(409);
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

  it('login válido define cookie de sessão e middleware permite acessar / sem voltar para /login', async () => {
    const loginReq = new NextRequest('https://ais-dev.run.app/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-proto': 'https' },
      body: JSON.stringify({ email: 'amanda@escritorio.adv.br', password: 'Admin@2026!' }),
    });

    const loginRes = await loginHandler(loginReq);
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.cookies.get('auth_session');
    expect(cookie?.value).toBe('user-amanda-admin');
    expect(cookie?.sameSite).toBe('none');
    expect(cookie?.secure).toBe(true);
    expect(cookie?.partitioned).toBe(true);

    const homeReq = new NextRequest('https://ais-dev.run.app/', {
      headers: { cookie: `auth_session=${cookie!.value}` },
    });
    const homeRes = await middleware(homeReq);
    expect(homeRes.status).toBe(200);
    expect(homeRes.headers.get('location')).toBeNull();
    expect(homeRes.headers.get('X-Frame-Options')).toBeNull();
  });
});

'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Scale,
  AlertCircle,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

type AuthMode = 'login' | 'signup';

interface LoginFormProps {
  supabaseConectado: boolean;
}

export function LoginForm({ supabaseConectado }: LoginFormProps) {
  const [modo, setModo] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const alternarModo = (novoModo: AuthMode) => {
    setModo(novoModo);
    setErro(null);
    setSucesso(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (modo === 'signup') {
      if (name.trim().length < 2) {
        setErro('Informe seu nome completo (mínimo de 2 caracteres).');
        return;
      }
      if (password.length < 6) {
        setErro('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErro('As senhas informadas não coincidem.');
        return;
      }
    }

    setCarregando(true);

    try {
      const endpoint = modo === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const payload =
        modo === 'login'
          ? { email, password }
          : { name: name.trim(), email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(
          data.erro ||
            (modo === 'login' ? 'Falha ao autenticar.' : 'Não foi possível criar a conta.')
        );
        setCarregando(false);
        return;
      }

      if (modo === 'signup' && data.confirmaEmail) {
        setSucesso(
          data.mensagem ||
            'Conta registrada no Supabase! Confirme o e-mail enviado para você (ou desative "Confirm email" no painel do Supabase) antes de entrar.'
        );
        setConfirmPassword('');
        setModo('login');
        setCarregando(false);
        return;
      }

      window.location.assign('/');
    } catch {
      setErro('Erro de conexão com o servidor. Tente novamente.');
      setCarregando(false);
    }
  };

  const preencherAcessoRapido = (e: string, p: string) => {
    setModo('login');
    setEmail(e);
    setPassword(p);
    setErro(null);
    setSucesso(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Scale className="w-6 h-6" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white text-balance">
          Gerador de Documentos
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Kit Previdenciário Oficial · Acesso Corporativo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-xl border border-slate-700/60 sm:rounded-xl sm:px-10">
          <div
            role="tablist"
            aria-label="Modo de acesso"
            className="grid grid-cols-2 gap-1 p-1 mb-6 bg-slate-900/90 border border-slate-700/70 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'login'}
              onClick={() => alternarModo('login')}
              className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                modo === 'login'
                  ? 'bg-slate-800 text-white border border-slate-600/70'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'signup'}
              onClick={() => alternarModo('signup')}
              className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                modo === 'signup'
                  ? 'bg-slate-800 text-white border border-slate-600/70'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar conta
            </button>
          </div>

          {sucesso && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-950/50 border border-emerald-700/60 flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{sucesso}</span>
            </div>
          )}

          {erro && (
            <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {modo === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-slate-300">
                  Nome completo
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dra. Mariana Ferreira"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                E-mail institucional
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete={modo === 'login' ? 'username' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="advogado@escritorio.adv.br"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                {modo === 'login' ? 'Senha de acesso' : 'Senha'}
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={modo === 'signup' ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              {modo === 'signup' && (
                <p className="mt-1 text-[11px] text-slate-400">Mínimo de 6 caracteres.</p>
              )}
            </div>

            {modo === 'signup' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-slate-300"
                >
                  Confirmar senha
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={carregando}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {carregando ? (
                  <span>{modo === 'login' ? 'Autenticando...' : 'Criando conta...'}</span>
                ) : modo === 'login' ? (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Criar Conta</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {modo === 'login' && !supabaseConectado && (
            <div className="mt-8 pt-6 border-t border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Contas Provisionadas (Ambiente Homologado):</span>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => preencherAcessoRapido('amanda@escritorio.adv.br', 'Admin@2026!')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-amber-300">
                      Dra. Amanda Oliveira
                    </div>
                    <div className="text-[11px] text-slate-400">amanda@escritorio.adv.br</div>
                  </div>
                  <span className="text-[11px] font-medium text-amber-400 whitespace-nowrap">
                    Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => preencherAcessoRapido('carlos@escritorio.adv.br', 'Carlos@2026!')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-amber-300">
                      Dr. Carlos Mendes
                    </div>
                    <div className="text-[11px] text-slate-400">carlos@escritorio.adv.br</div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                    Usuário
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => preencherAcessoRapido('bruna@escritorio.adv.br', 'Bruna@2026!')}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-amber-300">
                      Bruna Souza
                    </div>
                    <div className="text-[11px] text-slate-400">bruna@escritorio.adv.br</div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                    Usuário
                  </span>
                </button>
              </div>
            </div>
          )}

          <p className="mt-5 text-[11px] text-slate-400 text-center leading-relaxed">
            Novas contas são criadas com perfil padrão de usuário.
          </p>
        </div>
      </div>
    </div>
  );
}

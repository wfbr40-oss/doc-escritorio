'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Scale, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || 'Falha ao autenticar.');
        setCarregando(false);
        return;
      }

      router.push('/novo');
      router.refresh();
    } catch {
      setErro('Erro de conexão com o servidor. Tente novamente.');
      setCarregando(false);
    }
  };

  const preencherAcessoRapido = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setErro(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Scale className="w-6 h-6" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white">
          Gerador de Documentos
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Kit Previdenciário Oficial · Acesso Corporativo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-xl border border-slate-700/60 sm:rounded-xl sm:px-10">
          {erro && (
            <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                  type="email"
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
                Senha de acesso
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={carregando}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50"
              >
                {carregando ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Perfis Cadastrados para Teste Rápido */}
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
                <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
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
                <span className="text-[10px] font-mono font-medium text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded border border-slate-600/50">
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
                <span className="text-[10px] font-mono font-medium text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded border border-slate-600/50">
                  Usuário
                </span>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 text-center leading-relaxed">
              Cadastro público desativado. Contas provisionadas exclusivamente pela administração.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

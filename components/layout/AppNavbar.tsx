'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Scale, Shield, User, FileText, History } from 'lucide-react';

interface NavbarProps {
  usuario?: {
    id: string;
    name: string;
    role: 'user' | 'admin';
    email?: string;
  } | null;
}

export function AppNavbar({ usuario }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <Link
            href="/novo"
            className="text-base font-semibold tracking-tight text-white flex items-center gap-2.5 whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Scale className="w-4 h-4" />
            </div>
            <span>Kit Previdenciário</span>
          </Link>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link
              href="/novo"
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                pathname === '/novo' || pathname === '/'
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Gerar Kit</span>
            </Link>

            <Link
              href="/historico"
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                pathname === '/historico'
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico & Lotes</span>
            </Link>
          </nav>

          {/* Zone 3: 1 primary action / user info & logout */}
          <div className="flex items-center gap-4 shrink-0">
            {usuario ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-white flex items-center justify-end gap-1.5">
                    <span>{usuario.name}</span>
                    {usuario.role === 'admin' ? (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                        Usuário
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {usuario.email || 'escritorio.adv.br'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar sessão"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
              >
                Acessar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

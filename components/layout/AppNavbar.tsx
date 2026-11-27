'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  LogOut,
  FileText,
  History,
  SlidersHorizontal,
  Menu,
  X,
  UserCircle2,
} from 'lucide-react';

interface NavbarProps {
  usuario?: {
    id: string;
    name: string;
    role: 'user' | 'admin';
    email?: string;
  } | null;
}

export function AppNavbar({ usuario }: NavbarProps) {
  const pathname = usePathname();
  const ehAdmin = usuario?.role === 'admin';
  const [openedPath, setOpenedPath] = useState<string | null>(null);
  const menuAberto = openedPath === pathname;

  useEffect(() => {
    if (!menuAberto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenedPath(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuAberto]);

  const handleLogout = async () => {
    setOpenedPath(null);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } finally {
      window.location.assign('/login');
    }
  };

  const links = [
    {
      href: '/novo',
      label: 'Gerar Kit',
      descricao: 'Preencher cliente e emitir documentos DOCX',
      icon: FileText,
      ativo: pathname === '/novo' || pathname === '/',
    },
    {
      href: '/historico',
      label: 'Histórico & Lotes',
      descricao: 'Baixar pacotes ZIP e documentos anteriores',
      icon: History,
      ativo: pathname === '/historico',
    },
    ...(ehAdmin
      ? [
          {
            href: '/admin',
            label: 'Administração',
            descricao: 'Modelos DOCX, kits e permissões de usuários',
            icon: SlidersHorizontal,
            ativo: pathname.startsWith('/admin'),
          },
        ]
      : []),
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zona 1: Marca */}
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-white flex items-center gap-2.5 whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-jf.webp" alt="Josenildson Ferreira Advogados" className="h-11 w-auto" />
          </Link>

          {/* Zona 2 (Desktop >= lg / 1024px): Abas em linha única */}
          <nav
            aria-label="Navegação principal"
            className="hidden lg:flex items-center gap-7 text-sm font-medium"
          >
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 py-2 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    item.ativo
                      ? 'text-amber-400 font-semibold border-amber-400'
                      : 'text-slate-400 hover:text-slate-100 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Zona 3 (Desktop >= lg): Usuário e encerrar sessão */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {usuario ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-medium text-white">
                    <span>{usuario.name}</span>
                  </div>
                  {usuario.email && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      {usuario.email}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar sessão"
                  aria-label="Encerrar sessão"
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

          {/* Controles Mobile & Tablet Vertical (< lg / < 1024px) */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            {!usuario && (
              <Link
                href="/login"
                className="px-3 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap"
              >
                Acessar
              </Link>
            )}

            <button
              type="button"
              onClick={() => setOpenedPath((prev) => (prev === pathname ? null : pathname))}
              aria-expanded={menuAberto}
              aria-controls="menu-navegacao-responsivo"
              aria-label={menuAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-lg border border-slate-700/80 bg-slate-950/70 text-slate-200 hover:text-amber-300 hover:border-amber-500/40 hover:bg-slate-800 transition-colors"
            >
              {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="hidden sm:inline text-xs font-medium">
                {menuAberto ? 'Fechar' : 'Menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Painel do Menu Hambúrguer para Tablet na Vertical e Mobile (< lg) */}
      <AnimatePresence>
        {menuAberto && (
          <>
            <motion.div
              key="navbar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setOpenedPath(null)}
              className="fixed inset-x-0 top-16 bottom-0 bg-slate-950/70 backdrop-blur-xs z-30 lg:hidden"
              aria-hidden="true"
            />

            <motion.div
              id="menu-navegacao-responsivo"
              key="navbar-drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="lg:hidden absolute inset-x-0 top-16 z-40 bg-slate-900 border-b border-slate-800 shadow-2xl"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
                <nav aria-label="Menu de telas" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {links.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenedPath(null)}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors min-h-[56px] ${
                          item.ativo
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            item.ativo
                              ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold leading-tight">{item.label}</div>
                          <div className="text-xs text-slate-400 mt-0.5 leading-snug">
                            {item.descricao}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </nav>

                {usuario && (
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                        <UserCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{usuario.name}</p>
                        {usuario.email && (
                          <p className="text-xs text-slate-400 font-mono truncate">
                            {usuario.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs font-medium text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-900/50 transition-colors whitespace-nowrap shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Encerrar sessão</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}


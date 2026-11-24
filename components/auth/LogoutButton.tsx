'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const [saindo, setSaindo] = useState(false);

  const handleLogout = async () => {
    setSaindo(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } finally {
      window.location.assign('/login');
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={saindo}
      className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{saindo ? 'Saindo...' : 'Encerrar sessão'}</span>
    </button>
  );
}

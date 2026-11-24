import { getSessionProfile } from '@/src/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function HomePage() {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold">Gerador de Documentos Previdenciários</h1>
        <p className="text-sm text-slate-300 mt-3">
          Sessão ativa: <span className="font-medium text-white">{profile.name}</span>
        </p>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Perfil: {profile.role === 'admin' ? 'Administrador (admin)' : 'Usuário (user)'}
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}

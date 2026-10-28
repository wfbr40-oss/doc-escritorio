import { getSessionProfile } from '@/src/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Gerador de Documentos Previdenciários</h1>
        <p className="text-sm text-slate-400 mt-2">
          Sessão ativa: {profile.name} ({profile.role})
        </p>
      </div>
    </div>
  );
}

import { getSessionProfile } from '@/src/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { HistoricoWorkspace } from '@/components/historico/HistoricoWorkspace';

export const dynamic = 'force-dynamic';

export default async function HistoricoPage() {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AppNavbar usuario={profile} />
      <HistoricoWorkspace />
    </div>
  );
}

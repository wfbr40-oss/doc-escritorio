import { getSessionProfile } from '@/src/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { KitGeneratorWorkspace } from '@/components/gerador/KitGeneratorWorkspace';

export const dynamic = 'force-dynamic';

export default async function NovoKitPage() {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AppNavbar usuario={profile} />
      <KitGeneratorWorkspace />
    </div>
  );
}

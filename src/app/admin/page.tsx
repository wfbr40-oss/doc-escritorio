import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/src/lib/supabase/server';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { AdminWorkspace } from '@/components/admin/AdminWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect('/login');
  }

  if (profile.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AppNavbar usuario={profile} />
      <AdminWorkspace adminAtualId={profile.id} />
    </div>
  );
}

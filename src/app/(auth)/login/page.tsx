import { LoginForm } from '@/components/auth/LoginForm';
import { isSupabaseConfigured } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm supabaseConectado={isSupabaseConfigured()} />;
}

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/src/lib/supabase/admin-guard';
import { getCatalogForUser } from '@/src/lib/modelos/catalog';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, Profile } from '@/src/lib/supabase/store';

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const catalog = await getCatalogForUser(auth.session);

  // Carrega lista de usuários (Supabase + dataStore)
  let usersList: Profile[] = Array.from(dataStore.profiles.values());

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const extRes = await supabase
        .from('profiles')
        .select('id, name, email, role, ativo, allowed_kit_ids, created_at')
        .order('created_at', { ascending: false });

      if (!extRes.error && extRes.data) {
        usersList = extRes.data.map((u) => {
          const local = dataStore.profiles.get(u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email || local?.email || '—',
            role: u.role === 'admin' ? 'admin' : 'user',
            ativo: u.ativo !== false,
            allowed_kit_ids: u.allowed_kit_ids ?? null,
            created_at: u.created_at,
          };
        });
      } else {
        const basicRes = await supabase
          .from('profiles')
          .select('id, name, role, created_at')
          .order('created_at', { ascending: false });
        if (!basicRes.error && basicRes.data) {
          usersList = basicRes.data.map((u) => {
            const local = dataStore.profiles.get(u.id);
            return {
              id: u.id,
              name: u.name,
              email: local?.email || '—',
              role: u.role === 'admin' ? 'admin' : 'user',
              ativo: local?.ativo !== false,
              allowed_kit_ids: local?.allowed_kit_ids ?? null,
              created_at: u.created_at,
            };
          });
        }
      }
    } catch {
      // Fallback para dataStore
    }
  }

  const documents = catalog.documents.map((doc) => ({
    ...doc,
    hasCustomFile: dataStore.storageFiles.has(doc.template_file_path),
  }));

  return NextResponse.json({
    kits: catalog.kits,
    documents,
    clauses: catalog.clauses,
    variants: catalog.variants,
    parameters: catalog.parameters,
    users: usersList.sort((a, b) => a.name.localeCompare(b.name)),
  });
}

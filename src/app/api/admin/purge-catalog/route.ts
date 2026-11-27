import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, formatSupabaseWriteError } from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore } from '@/src/lib/supabase/store';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      // Deleta todos os kits (as tabelas documents, clauses, variants, parameters caem em cascata)
      const { error } = await supabase.from('kits').delete().neq('id', '__none__');
      if (error) {
        return NextResponse.json(
          { erro: formatSupabaseWriteError(error, 'Erro ao excluir modelos e kits do Supabase.') },
          { status: 400 }
        );
      }
    }

    // Limpa o dataStore em memória também
    dataStore.kits.clear();
    dataStore.documents.clear();
    dataStore.clauses.clear();
    dataStore.variants.clear();
    dataStore.parameters.clear();
    dataStore.storageFiles.clear();

    logSeguro('admin_purge_catalog', { userId: auth.session.id });

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Todos os modelos e kits foram excluídos do Supabase e da memória com sucesso.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno ao excluir modelos e kits.';
    return NextResponse.json(
      { erro: errorMsg },
      { status: 500 }
    );
  }
}

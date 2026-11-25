import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore } from '@/src/lib/supabase/store';
import { syncCatalogFromSupabase } from '@/src/lib/modelos/catalog';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase();
    const { id } = await context.params;
    const existente = dataStore.kits.get(id);
    if (!existente) {
      return NextResponse.json({ erro: 'Kit não encontrado.' }, { status: 404 });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : existente.name;
    const description =
      typeof body.description === 'string' ? body.description.trim() : existente.description;

    if (name.length < 3) {
      return NextResponse.json(
        { erro: 'O nome do kit deve ter ao menos 3 caracteres.' },
        { status: 400 }
      );
    }

    const atualizado = {
      ...existente,
      name,
      description,
    };

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { error } = await supabase
        .from('kits')
        .update({ name, description })
        .eq('id', id);
      if (error) {
        return NextResponse.json(
          { erro: 'Não foi possível atualizar o kit no banco de dados.' },
          { status: 500 }
        );
      }
    }

    dataStore.kits.set(id, atualizado);
    logSeguro('admin_kit_atualizado', { userId: auth.session.id, ids: [id] });

    return NextResponse.json({ ok: true, kit: atualizado });
  } catch (error) {
    logSeguro('admin_kit_update_erro', { erro: String(error) });
    return NextResponse.json({ erro: 'Erro ao atualizar kit.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase();
    const { id } = await context.params;
    const existente = dataStore.kits.get(id);
    if (!existente) {
      return NextResponse.json({ erro: 'Kit não encontrado.' }, { status: 404 });
    }

    if (dataStore.kits.size <= 1) {
      return NextResponse.json(
        { erro: 'O sistema deve manter pelo menos um kit ativo cadastrado.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { error } = await supabase.from('kits').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          {
            erro: 'Não foi possível excluir este kit porque existem documentos gerados vinculados ao histórico.',
          },
          { status: 409 }
        );
      }
    }

    // Remove documentos associados do store em memória
    for (const [docId, doc] of dataStore.documents.entries()) {
      if (doc.kit_id === id) {
        dataStore.documents.delete(docId);
        dataStore.storageFiles.delete(doc.template_file_path);
      }
    }
    dataStore.kits.delete(id);

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_kit_excluido',
      target_id: id,
      created_at: new Date().toISOString(),
    });

    logSeguro('admin_kit_excluido', { userId: auth.session.id, ids: [id] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logSeguro('admin_kit_delete_erro', { erro: String(error) });
    return NextResponse.json({ erro: 'Erro ao excluir kit.' }, { status: 500 });
  }
}

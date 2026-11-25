import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, slugifyId } from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, Kit } from '@/src/lib/supabase/store';
import { syncCatalogFromSupabase } from '@/src/lib/modelos/catalog';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase();

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const copyFromKitId =
      typeof body.copyFromKitId === 'string' && body.copyFromKitId.trim()
        ? body.copyFromKitId.trim()
        : null;

    if (name.length < 3) {
      return NextResponse.json(
        { erro: 'O nome do kit deve ter ao menos 3 caracteres.' },
        { status: 400 }
      );
    }

    const kitId = slugifyId('kit', name);
    const createdAt = new Date().toISOString();
    const novoKit: Kit = {
      id: kitId,
      name,
      description,
      created_at: createdAt,
    };

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { error } = await supabase.from('kits').insert({
        id: novoKit.id,
        name: novoKit.name,
        description: novoKit.description,
        created_at: novoKit.created_at,
      });
      if (error) {
        return NextResponse.json(
          { erro: 'Não foi possível salvar o kit no banco de dados.' },
          { status: 500 }
        );
      }
    }

    dataStore.kits.set(novoKit.id, novoKit);

    // Opcionalmente clona modelos de um kit existente para agilizar criação
    if (copyFromKitId && dataStore.kits.has(copyFromKitId)) {
      const origemDocs = Array.from(dataStore.documents.values())
        .filter((d) => d.kit_id === copyFromKitId)
        .sort((a, b) => a.order_index - b.order_index);

      for (const docOrigem of origemDocs) {
        const novoDocId = slugifyId('doc', docOrigem.name);
        const novoPath = `molduras/${novoDocId}.docx`;
        const bytesOriginais = dataStore.storageFiles.get(docOrigem.template_file_path);
        if (bytesOriginais) {
          dataStore.storageFiles.set(novoPath, bytesOriginais);
        }

        const docCopiado = {
          id: novoDocId,
          kit_id: novoKit.id,
          name: docOrigem.name,
          kind: docOrigem.kind,
          template_file_path: novoPath,
          template_content: docOrigem.template_content
            ? {
                ...docOrigem.template_content,
                paragrafos: [...docOrigem.template_content.paragrafos],
              }
            : null,
          order_index: docOrigem.order_index,
          created_at: createdAt,
        };

        dataStore.documents.set(docCopiado.id, docCopiado);

        if (isSupabaseConfigured()) {
          const supabase = await createClient();
          await supabase.from('documents').insert({
            id: docCopiado.id,
            kit_id: docCopiado.kit_id,
            name: docCopiado.name,
            kind: docCopiado.kind,
            template_file_path: docCopiado.template_file_path,
            order_index: docCopiado.order_index,
            created_at: docCopiado.created_at,
          });
        }
      }
    }

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_kit_criado',
      target_id: novoKit.id,
      metadata: { name: novoKit.name },
      created_at: createdAt,
    });

    logSeguro('admin_kit_criado', { userId: auth.session.id, ids: [novoKit.id] });

    return NextResponse.json({ ok: true, kit: novoKit }, { status: 201 });
  } catch (error) {
    logSeguro('admin_kit_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Não foi possível criar o novo kit.' },
      { status: 500 }
    );
  }
}

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  validateDocxBuffer,
} from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, DocumentItem, TemplateContent } from '@/src/lib/supabase/store';
import { createTemplateDocx } from '@/src/lib/docx/builder';
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
    const existente = dataStore.documents.get(id);
    if (!existente) {
      return NextResponse.json({ erro: 'Modelo não encontrado.' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    let name = existente.name;
    let kitId = existente.kit_id;
    let kind = existente.kind;
    let orderIndex = existente.order_index;
    let titulo = existente.template_content?.titulo || '';
    let subtitulo = existente.template_content?.subtitulo || '';
    let paragrafos: string[] | null = null;
    let uploadedBytes: Uint8Array | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      if (formData.has('name')) name = String(formData.get('name')).trim();
      if (formData.has('kit_id')) kitId = String(formData.get('kit_id')).trim();
      if (formData.has('kind')) {
        kind = String(formData.get('kind')) === 'static' ? 'static' : 'template';
      }
      if (formData.has('order_index')) {
        const parsedOrder = Number(formData.get('order_index'));
        if (!Number.isNaN(parsedOrder)) orderIndex = parsedOrder;
      }
      if (formData.has('titulo')) titulo = String(formData.get('titulo')).trim();
      if (formData.has('subtitulo')) subtitulo = String(formData.get('subtitulo')).trim();
      if (formData.has('paragrafos')) {
        const raw = String(formData.get('paragrafos') || '').trim();
        if (raw) {
          paragrafos = raw
            .split(/\r?\n/)
            .map((p) => p.trim())
            .filter(Boolean);
        }
      }

      const file = formData.get('file');
      if (file && file instanceof File && file.size > 0) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const valido = await validateDocxBuffer(bytes);
        if (!valido) {
          return NextResponse.json(
            { erro: 'Arquivo inválido. Envie um documento .docx válido do Microsoft Word.' },
            { status: 400 }
          );
        }
        uploadedBytes = bytes;
      }
    } else {
      const body = await req.json();
      if (typeof body.name === 'string') name = body.name.trim();
      if (typeof body.kit_id === 'string') kitId = body.kit_id.trim();
      if (body.kind === 'static' || body.kind === 'template') kind = body.kind;
      if (typeof body.order_index === 'number') orderIndex = body.order_index;
      if (typeof body.titulo === 'string') titulo = body.titulo.trim();
      if (typeof body.subtitulo === 'string') subtitulo = body.subtitulo.trim();
      if (Array.isArray(body.paragrafos)) {
        paragrafos = body.paragrafos
          .map((p: unknown) => String(p).trim())
          .filter(Boolean);
      } else if (typeof body.paragrafos === 'string' && body.paragrafos.trim()) {
        paragrafos = body.paragrafos
          .split(/\r?\n/)
          .map((p: string) => p.trim())
          .filter(Boolean);
      }
    }

    if (name.length < 3) {
      return NextResponse.json(
        { erro: 'O nome do modelo deve ter ao menos 3 caracteres.' },
        { status: 400 }
      );
    }

    if (!dataStore.kits.has(kitId)) {
      return NextResponse.json({ erro: 'Kit de destino inválido.' }, { status: 400 });
    }

    let nextTemplateContent: TemplateContent | null = existente.template_content ?? null;
    let nextBytes: Uint8Array | null = null;

    if (uploadedBytes) {
      nextBytes = uploadedBytes;
      nextTemplateContent = null;
    } else if (paragrafos && paragrafos.length > 0) {
      nextTemplateContent = {
        titulo: titulo || name.toUpperCase(),
        ...(subtitulo ? { subtitulo } : {}),
        paragrafos,
      };
      nextBytes = await createTemplateDocx(
        nextTemplateContent.titulo,
        nextTemplateContent.paragrafos,
        { subtitulo: nextTemplateContent.subtitulo }
      );
    }

    const atualizado: DocumentItem = {
      ...existente,
      name,
      kit_id: kitId,
      kind,
      order_index: orderIndex,
      template_content: nextTemplateContent,
    };

    if (isSupabaseConfigured()) {
      const supabase = await createClient();

      if (nextBytes) {
        try {
          const objectPath = atualizado.template_file_path.replace(/^molduras\//, '');
          await supabase.storage.from('molduras').upload(objectPath, nextBytes, {
            contentType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true,
          });
        } catch {
          // Storage opcional
        }
      }

      const extUpdate = await supabase
        .from('documents')
        .update({
          name: atualizado.name,
          kit_id: atualizado.kit_id,
          kind: atualizado.kind,
          order_index: atualizado.order_index,
          template_content: atualizado.template_content,
        })
        .eq('id', id);

      if (extUpdate.error) {
        const basicUpdate = await supabase
          .from('documents')
          .update({
            name: atualizado.name,
            kit_id: atualizado.kit_id,
            kind: atualizado.kind,
            order_index: atualizado.order_index,
          })
          .eq('id', id);

        if (basicUpdate.error) {
          return NextResponse.json(
            { erro: 'Não foi possível atualizar o modelo no banco de dados.' },
            { status: 500 }
          );
        }
      }
    }

    if (nextBytes) {
      dataStore.storageFiles.set(atualizado.template_file_path, nextBytes);
    }
    dataStore.documents.set(id, atualizado);

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_modelo_atualizado',
      target_id: id,
      metadata: { kitId: atualizado.kit_id },
      created_at: new Date().toISOString(),
    });

    logSeguro('admin_modelo_atualizado', { userId: auth.session.id, documentId: id });
    return NextResponse.json({ ok: true, document: atualizado });
  } catch (error) {
    logSeguro('admin_modelo_update_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Ocorreu um erro ao modificar o modelo.' },
      { status: 500 }
    );
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
    const existente = dataStore.documents.get(id);
    if (!existente) {
      return NextResponse.json({ erro: 'Modelo não encontrado.' }, { status: 404 });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          {
            erro: 'Não foi possível excluir este modelo porque já existem documentos gerados vinculados a ele no histórico.',
          },
          { status: 409 }
        );
      }

      try {
        const objectPath = existente.template_file_path.replace(/^molduras\//, '');
        await supabase.storage.from('molduras').remove([objectPath]);
      } catch {
        // Ignora erro de remoção no Storage se arquivo não existir remotamente
      }
    }

    dataStore.documents.delete(id);
    dataStore.storageFiles.delete(existente.template_file_path);

    for (const [clauseId, clause] of dataStore.clauses.entries()) {
      if (clause.document_id === id) {
        for (const [variantId, variant] of dataStore.variants.entries()) {
          if (variant.clause_id === clauseId) {
            dataStore.variants.delete(variantId);
          }
        }
        dataStore.clauses.delete(clauseId);
      }
    }

    for (const [paramId, param] of dataStore.parameters.entries()) {
      if (param.document_id === id) {
        dataStore.parameters.delete(paramId);
      }
    }

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_modelo_excluido',
      target_id: id,
      created_at: new Date().toISOString(),
    });

    logSeguro('admin_modelo_excluido', { userId: auth.session.id, documentId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logSeguro('admin_modelo_delete_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Ocorreu um erro ao excluir o modelo.' },
      { status: 500 }
    );
  }
}

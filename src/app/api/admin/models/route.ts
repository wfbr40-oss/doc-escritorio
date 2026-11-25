import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminSession,
  slugifyId,
  validateDocxBuffer,
} from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, DocumentItem, TemplateContent } from '@/src/lib/supabase/store';
import { createTemplateDocx } from '@/src/lib/docx/builder';
import { syncCatalogFromSupabase } from '@/src/lib/modelos/catalog';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase();

    const contentType = req.headers.get('content-type') || '';
    let name = '';
    let kitId = '';
    let kind: 'template' | 'static' = 'template';
    let orderIndex = 1;
    let titulo = '';
    let subtitulo = '';
    let paragrafos: string[] = [];
    let uploadedBytes: Uint8Array | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      name = String(formData.get('name') || '').trim();
      kitId = String(formData.get('kit_id') || '').trim();
      kind = String(formData.get('kind') || 'template') === 'static' ? 'static' : 'template';
      orderIndex = Number(formData.get('order_index') || 1) || 1;
      titulo = String(formData.get('titulo') || '').trim();
      subtitulo = String(formData.get('subtitulo') || '').trim();
      const rawParagrafos = String(formData.get('paragrafos') || '').trim();
      if (rawParagrafos) {
        paragrafos = rawParagrafos
          .split(/\r?\n/)
          .map((p) => p.trim())
          .filter(Boolean);
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
      name = typeof body.name === 'string' ? body.name.trim() : '';
      kitId = typeof body.kit_id === 'string' ? body.kit_id.trim() : '';
      kind = body.kind === 'static' ? 'static' : 'template';
      orderIndex = Number(body.order_index || 1) || 1;
      titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
      subtitulo = typeof body.subtitulo === 'string' ? body.subtitulo.trim() : '';
      if (Array.isArray(body.paragrafos)) {
        paragrafos = body.paragrafos
          .map((p: unknown) => String(p).trim())
          .filter(Boolean);
      } else if (typeof body.paragrafos === 'string') {
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

    if (!kitId || !dataStore.kits.has(kitId)) {
      return NextResponse.json(
        { erro: 'Selecione um kit válido para vincular o modelo.' },
        { status: 400 }
      );
    }

    const docId = slugifyId('doc', name);
    const templateFilePath = `molduras/${docId}.docx`;
    const createdAt = new Date().toISOString();

    let templateContent: TemplateContent | null = null;
    let finalBytes: Uint8Array;

    if (uploadedBytes) {
      finalBytes = uploadedBytes;
    } else {
      const defaultParagraphs =
        paragrafos.length > 0
          ? paragrafos
          : kind === 'static'
            ? ['Documento estático padrão do escritório.']
            : [
                'OUTORGANTE / REQUERENTE: {{CLIENTE_NOME}}, {{CLIENTE_QUALIFICACAO}}.',
                'OBJETO: Declaração e requerimento administrativo/judicial conforme poderes outorgados.',
                '{{ASSINATURA_LOCAL_DATA}}',
                '______________________________________________________',
                '{{CLIENTE_NOME}}',
              ];

      templateContent = {
        titulo: titulo || name.toUpperCase(),
        ...(subtitulo ? { subtitulo } : {}),
        paragrafos: defaultParagraphs,
      };

      finalBytes = await createTemplateDocx(
        templateContent.titulo,
        templateContent.paragrafos,
        { subtitulo: templateContent.subtitulo }
      );
    }

    const novoDoc: DocumentItem = {
      id: docId,
      kit_id: kitId,
      name,
      kind,
      template_file_path: templateFilePath,
      template_content: templateContent,
      order_index: orderIndex,
      created_at: createdAt,
    };

    if (isSupabaseConfigured()) {
      const supabase = await createClient();

      // Upload para bucket privado 'molduras' (melhor esforço sem bloquear caso bucket ainda não exista)
      try {
        const objectPath = templateFilePath.replace(/^molduras\//, '');
        await supabase.storage.from('molduras').upload(objectPath, finalBytes, {
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        });
      } catch {
        // Storage remoto opcional caso bucket não tenha sido provisionado ainda
      }

      const extInsert = await supabase.from('documents').insert({
        id: novoDoc.id,
        kit_id: novoDoc.kit_id,
        name: novoDoc.name,
        kind: novoDoc.kind,
        template_file_path: novoDoc.template_file_path,
        template_content: novoDoc.template_content,
        order_index: novoDoc.order_index,
        created_at: novoDoc.created_at,
      });

      if (extInsert.error) {
        const basicInsert = await supabase.from('documents').insert({
          id: novoDoc.id,
          kit_id: novoDoc.kit_id,
          name: novoDoc.name,
          kind: novoDoc.kind,
          template_file_path: novoDoc.template_file_path,
          order_index: novoDoc.order_index,
          created_at: novoDoc.created_at,
        });

        if (basicInsert.error) {
          return NextResponse.json(
            { erro: 'Não foi possível salvar o novo modelo no banco de dados.' },
            { status: 500 }
          );
        }
      }
    }

    dataStore.storageFiles.set(templateFilePath, finalBytes);
    dataStore.documents.set(novoDoc.id, novoDoc);

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_modelo_criado',
      target_id: novoDoc.id,
      metadata: { kitId: novoDoc.kit_id, kind: novoDoc.kind },
      created_at: createdAt,
    });

    logSeguro('admin_modelo_criado', { userId: auth.session.id, documentId: novoDoc.id });

    return NextResponse.json({ ok: true, document: novoDoc }, { status: 201 });
  } catch (error) {
    logSeguro('admin_modelo_create_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Ocorreu um erro ao adicionar o modelo.' },
      { status: 500 }
    );
  }
}

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseWriteError,
  isDocxFileName,
  requireAdminSession,
  slugifyId,
  validateDocxBuffer,
} from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, DocumentItem, TemplateContent } from '@/src/lib/supabase/store';
import { createTemplateDocx } from '@/src/lib/docx/builder';
import {
  ensureKitExistsInSupabase,
  syncCatalogFromSupabase,
} from '@/src/lib/modelos/catalog';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase({ seedIfEmpty: true });

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
      if (
        file &&
        typeof file === 'object' &&
        'arrayBuffer' in file &&
        typeof file.arrayBuffer === 'function' &&
        'size' in file &&
        Number(file.size) > 0
      ) {
        const fileName = 'name' in file && typeof file.name === 'string' ? file.name : '';
        if (fileName && !isDocxFileName(fileName)) {
          return NextResponse.json(
            {
              erro: 'Formato de arquivo não permitido. O arquivo anexado deve ser em formato .docx.',
            },
            { status: 400 }
          );
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.byteLength > 15 * 1024 * 1024) {
          return NextResponse.json(
            {
              erro: 'O arquivo excede o tamanho máximo de 15 MB. O arquivo anexado deve ser um .docx de até 15 MB.',
            },
            { status: 400 }
          );
        }

        const valido = await validateDocxBuffer(bytes);
        if (!valido) {
          return NextResponse.json(
            {
              erro: 'Arquivo inválido ou corrompido. O documento anexado deve ser um arquivo .docx válido.',
            },
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

      // Garante que o kit pai exista na tabela public.kits antes de inserir o modelo
      const kitEnsure = await ensureKitExistsInSupabase(supabase, kitId);
      if (kitEnsure.error) {
        logSeguro('admin_modelo_kit_ensure_erro', {
          userId: auth.session.id,
          erro: kitEnsure.error.message,
        });
        return NextResponse.json(
          {
            erro: formatSupabaseWriteError(
              kitEnsure.error,
              'Não foi possível validar o kit pai no Supabase.'
            ),
          },
          { status: kitEnsure.error.code === '42501' ? 403 : 500 }
        );
      }

      // Envia o arquivo .docx para o bucket privado 'molduras'
      const objectPath = templateFilePath.replace(/^molduras\//, '');
      const { error: storageError } = await supabase.storage
        .from('molduras')
        .upload(objectPath, finalBytes, {
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });

      if (storageError) {
        logSeguro('admin_modelo_storage_erro', {
          userId: auth.session.id,
          erro: storageError.message,
        });
        if (uploadedBytes) {
          return NextResponse.json(
            {
              erro: formatSupabaseWriteError(
                storageError,
                "Não foi possível enviar o arquivo .docx para o Storage do Supabase (bucket 'molduras')."
              ),
            },
            { status: 500 }
          );
        }
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
        const isMissingCol =
          extInsert.error.code === '42703' ||
          extInsert.error.message?.includes('template_content');

        if (isMissingCol) {
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
            logSeguro('admin_modelo_db_erro', {
              userId: auth.session.id,
              erro: basicInsert.error.message,
            });
            return NextResponse.json(
              {
                erro: formatSupabaseWriteError(
                  basicInsert.error,
                  'Não foi possível salvar o novo modelo no Supabase.'
                ),
              },
              { status: basicInsert.error.code === '42501' ? 403 : 500 }
            );
          }
        } else {
          logSeguro('admin_modelo_db_erro', {
            userId: auth.session.id,
            erro: extInsert.error.message,
          });
          return NextResponse.json(
            {
              erro: formatSupabaseWriteError(
                extInsert.error,
                'Não foi possível salvar o novo modelo no Supabase.'
              ),
            },
            { status: extInsert.error.code === '42501' ? 403 : 500 }
          );
        }
      }

      await supabase.from('audit_log').insert({
        user_id: auth.session.id,
        action: 'admin_modelo_criado',
        target_id: novoDoc.id,
        metadata: { kitId: novoDoc.kit_id, kind: novoDoc.kind },
      });
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

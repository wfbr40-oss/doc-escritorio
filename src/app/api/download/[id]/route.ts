import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionProfile } from '@/src/lib/supabase/session';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, GeneratedDocument } from '@/src/lib/supabase/store';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json(
        { erro: 'Acesso não autorizado. É necessário estar autenticado.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    let doc: GeneratedDocument | undefined = dataStore.generatedDocs.get(id);
    const supabase = isSupabaseConfigured() ? await createClient() : null;

    if (!doc && supabase) {
      const { data: row } = await supabase
        .from('generated_documents')
        .select('id, batch_id, document_id, user_id, snapshot, file_path, status, expires_at, created_at')
        .eq('id', id)
        .single();

      if (row) {
        const snap =
          row.snapshot && typeof row.snapshot === 'object'
            ? (row.snapshot as Record<string, unknown>)
            : null;
        doc = {
          id: row.id,
          batch_id: row.batch_id,
          document_id: row.document_id,
          document_name:
            (typeof snap?.documentName === 'string' && snap.documentName) ||
            row.document_id,
          user_id: row.user_id || '',
          user_name: (typeof snap?.userName === 'string' && snap.userName) || 'Usuário',
          client_masked_name:
            (typeof snap?.clientMaskedName === 'string' && snap.clientMaskedName) ||
            'Cliente',
          file_path: row.file_path,
          status: row.status === 'expirado' ? 'expirado' : 'ativo',
          snapshot: snap,
          expires_at: row.expires_at,
          created_at: row.created_at,
        };
      }
    }

    if (!doc) {
      return NextResponse.json(
        { erro: 'Documento não encontrado ou já expirado.' },
        { status: 404 }
      );
    }

    if (doc.status === 'expirado') {
      return NextResponse.json(
        { erro: 'Este documento atingiu o prazo de retenção de 1 ano e foi expirado.' },
        { status: 410 }
      );
    }

    let fileBytes = dataStore.storageFiles.get(doc.file_path) || doc.file_bytes;

    if (!fileBytes && supabase) {
      const objectPath = doc.file_path.replace(/^gerados\//, '');
      const { data: blob, error: dlErr } = await supabase.storage
        .from('gerados')
        .download(objectPath);
      if (!dlErr && blob) {
        fileBytes = new Uint8Array(await blob.arrayBuffer());
        dataStore.storageFiles.set(doc.file_path, fileBytes);
      }
    }

    if (!fileBytes) {
      return NextResponse.json(
        { erro: 'Arquivo físico não encontrado no armazenamento.' },
        { status: 404 }
      );
    }

    if (supabase) {
      try {
        await supabase.from('audit_log').insert({
          user_id: session.id,
          action: 'download',
          target_id: id,
        });
      } catch {
        // Melhor esforço
      }
    }

    // Grava no audit_log quem baixou (sem dados de cliente)
    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: session.id,
      user_name: session.name,
      action: 'download',
      target_id: id,
      created_at: new Date().toISOString(),
    });

    logSeguro('documento_baixado', {
      userId: session.id,
      documentId: id,
      batchId: doc.batch_id,
    });

    const filename = `${doc.document_id}_${id.slice(0, 8)}.docx`;

    return new Response(fileBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logSeguro('download_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Erro ao processar download do documento.' },
      { status: 500 }
    );
  }
}

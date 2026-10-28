import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionProfile } from '@/src/lib/supabase/session';
import { dataStore } from '@/src/lib/supabase/store';
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
    const doc = dataStore.generatedDocs.get(id);

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

    const fileBytes = dataStore.storageFiles.get(doc.file_path) || doc.file_bytes;
    if (!fileBytes) {
      return NextResponse.json(
        { erro: 'Arquivo físico não encontrado no armazenamento.' },
        { status: 404 }
      );
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

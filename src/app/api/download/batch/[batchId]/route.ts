import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionProfile } from '@/src/lib/supabase/session';
import { dataStore } from '@/src/lib/supabase/store';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json(
        { erro: 'Acesso não autorizado. É necessário estar autenticado.' },
        { status: 401 }
      );
    }

    const { batchId } = await params;
    const zipPath = `gerados/${batchId}/kit_completo.zip`;
    const zipBytes = dataStore.storageFiles.get(zipPath);

    if (!zipBytes) {
      return NextResponse.json(
        { erro: 'Arquivo compactado do lote não encontrado ou já expirado.' },
        { status: 404 }
      );
    }

    // Grava no audit_log quem baixou o lote
    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: session.id,
      user_name: session.name,
      action: 'download_kit_zip',
      target_id: batchId,
      created_at: new Date().toISOString(),
    });

    logSeguro('kit_zip_baixado', {
      userId: session.id,
      batchId,
    });

    return new Response(zipBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Kit_Previdenciario_${batchId.slice(0, 8)}.zip"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logSeguro('download_zip_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Erro ao processar download do pacote zip.' },
      { status: 500 }
    );
  }
}

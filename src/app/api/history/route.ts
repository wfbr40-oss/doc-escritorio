import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/src/lib/supabase/session';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, GeneratedDocument } from '@/src/lib/supabase/store';
import { syncCatalogFromSupabase } from '@/src/lib/modelos/catalog';
import { diasParaExpirar } from '@/src/lib/retencao/purge';

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  await syncCatalogFromSupabase();

  const mergedDocs = new Map<string, GeneratedDocument>(dataStore.generatedDocs);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: rows, error } = await supabase
        .from('generated_documents')
        .select('id, batch_id, document_id, user_id, snapshot, file_path, status, expires_at, created_at')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && rows) {
        for (const row of rows) {
          if (mergedDocs.has(row.id)) continue;
          const snap =
            row.snapshot && typeof row.snapshot === 'object'
              ? (row.snapshot as Record<string, unknown>)
              : null;
          const docDef = dataStore.documents.get(row.document_id);
          mergedDocs.set(row.id, {
            id: row.id,
            batch_id: row.batch_id,
            document_id: row.document_id,
            document_name:
              (typeof snap?.documentName === 'string' && snap.documentName) ||
              docDef?.name ||
              row.document_id,
            user_id: row.user_id || '',
            user_name:
              (typeof snap?.userName === 'string' && snap.userName) || 'Usuário',
            client_masked_name:
              (typeof snap?.clientMaskedName === 'string' && snap.clientMaskedName) ||
              'Cliente',
            file_path: row.file_path,
            status: row.status === 'expirado' ? 'expirado' : 'ativo',
            snapshot: snap,
            expires_at: row.expires_at,
            created_at: row.created_at,
          });
        }
      }
    } catch {
      // Fallback para dataStore em memória
    }
  }

  const agora = new Date();
  const docs = Array.from(mergedDocs.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((doc) => {
      const diasRestantes = diasParaExpirar(doc.expires_at, agora);
      return {
        id: doc.id,
        batch_id: doc.batch_id,
        document_id: doc.document_id,
        document_name: doc.document_name,
        user_name: doc.user_name,
        client_masked_name: doc.client_masked_name,
        status: doc.status,
        expires_at: doc.expires_at,
        created_at: doc.created_at,
        dias_restantes: diasRestantes,
        aviso_expiracao: doc.status === 'ativo' && diasRestantes <= 30 && diasRestantes > 0,
      };
    });

  // Agrupamento por lote (batch_id) para download em lote
  const lotesMap = new Map<string, {
    batch_id: string;
    client_masked_name: string;
    user_name: string;
    created_at: string;
    expires_at: string;
    total_documentos: number;
    status: string;
    dias_restantes: number;
    aviso_expiracao: boolean;
  }>();

  for (const doc of docs) {
    if (!lotesMap.has(doc.batch_id)) {
      lotesMap.set(doc.batch_id, {
        batch_id: doc.batch_id,
        client_masked_name: doc.client_masked_name,
        user_name: doc.user_name,
        created_at: doc.created_at,
        expires_at: doc.expires_at,
        total_documentos: 1,
        status: doc.status,
        dias_restantes: doc.dias_restantes,
        aviso_expiracao: doc.aviso_expiracao,
      });
    } else {
      const lote = lotesMap.get(doc.batch_id)!;
      lote.total_documentos += 1;
    }
  }

  // Lista dos logs de auditoria (somente admin conforme política "Admin lê audit_log")
  const auditLogs = session.role === 'admin' ? dataStore.auditLogs.slice(0, 50) : [];

  return NextResponse.json({
    documentos: docs,
    lotes: Array.from(lotesMap.values()),
    auditLogs,
  });
}

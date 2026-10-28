import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/src/lib/supabase/session';
import { dataStore } from '@/src/lib/supabase/store';
import { diasParaExpirar } from '@/src/lib/retencao/purge';

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  const agora = new Date();
  const docs = Array.from(dataStore.generatedDocs.values())
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

  // Lista dos logs de auditoria
  const auditLogs = dataStore.auditLogs.slice(0, 50);

  return NextResponse.json({
    documentos: docs,
    lotes: Array.from(lotesMap.values()),
    auditLogs,
  });
}

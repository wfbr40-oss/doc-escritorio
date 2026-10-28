import { dataStore } from '../supabase/store';
import { logSeguro } from '../logs/seguro';

/**
 * Procedimento de retenção de 1 ano.
 * Remove os arquivos binários do storage e zera o snapshot de todos os
 * documentos cujo expires_at seja anterior ou igual à data de referência.
 * Mantém metadados de auditoria e status 'expirado' sem conter dados pessoais (PII).
 */
export async function purgeExpired(referenceDate: Date = new Date()): Promise<{ removidos: number }> {
  let removidos = 0;
  const idsRemovidos: string[] = [];

  for (const [id, doc] of dataStore.generatedDocs.entries()) {
    const expDate = new Date(doc.expires_at);

    if (doc.status === 'ativo' && expDate <= referenceDate) {
      // 1. Remove arquivo do storage
      dataStore.storageFiles.delete(doc.file_path);

      // 2. Zera snapshot e atualiza status para expirado
      doc.snapshot = null;
      doc.status = 'expirado';
      doc.file_bytes = undefined;

      removidos++;
      idsRemovidos.push(id);
    }
  }

  // Também limpa arquivos ZIP de lotes expirados se existirem
  for (const key of dataStore.storageFiles.keys()) {
    if (key.endsWith('kit_completo.zip')) {
      // Se todos os documentos desse lote estiverem expirados, limpa o zip
      const match = key.match(/gerados\/([^/]+)\/kit_completo\.zip/);
      if (match) {
        const batchId = match[1];
        const docsInBatch = Array.from(dataStore.generatedDocs.values()).filter(
          (d) => d.batch_id === batchId
        );
        if (docsInBatch.length > 0 && docsInBatch.every((d) => d.status === 'expirado')) {
          dataStore.storageFiles.delete(key);
        }
      }
    }
  }

  logSeguro('expiracao_retencao_executada', {
    ids: idsRemovidos,
    status: `Removidos: ${removidos}`,
  });

  return { removidos };
}

/**
 * Calcula a quantidade de dias restantes até a expiração.
 */
export function diasParaExpirar(expiresAtIso: string, dataReferencia: Date = new Date()): number {
  const exp = new Date(expiresAtIso).getTime();
  const ref = dataReferencia.getTime();
  const diffMs = exp - ref;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

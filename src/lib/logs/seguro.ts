/**
 * Módulo de log seguro para proteção de dados (LGPD).
 * Nunca recebe dados pessoais (PII) como nomes de clientes, CPFs, endereços.
 * Apenas recebe identificadores de lote, IDs de documentos e tipos de eventos.
 */

export interface ContextoLogSeguro {
  ids?: string[];
  userId?: string;
  batchId?: string;
  documentId?: string;
  status?: string;
  erro?: string;
}

export function logSeguro(evento: string, ctx?: ContextoLogSeguro): void {
  const timestamp = new Date().toISOString();
  const sanitizedCtx: Record<string, unknown> = {};

  if (ctx?.ids) sanitizedCtx.ids = ctx.ids;
  if (ctx?.userId) sanitizedCtx.userId = ctx.userId;
  if (ctx?.batchId) sanitizedCtx.batchId = ctx.batchId;
  if (ctx?.documentId) sanitizedCtx.documentId = ctx.documentId;
  if (ctx?.status) sanitizedCtx.status = ctx.status;
  if (ctx?.erro) sanitizedCtx.erro = ctx.erro;

  // Formato estruturado e limpo sem PII
  const logEntry = {
    timestamp,
    evento,
    ...sanitizedCtx,
  };

  // Saída padrão para stdout/stderr do servidor
  if (ctx?.erro) {
    console.error('[SEGURANCA_AUDIT_ERRO]', JSON.stringify(logEntry));
  } else {
    console.log('[SEGURANCA_AUDIT]', JSON.stringify(logEntry));
  }
}

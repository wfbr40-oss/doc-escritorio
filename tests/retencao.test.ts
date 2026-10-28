import { describe, it, expect, beforeEach } from 'vitest';
import { purgeExpired, diasParaExpirar } from '../src/lib/retencao/purge';
import { dataStore } from '../src/lib/supabase/store';
import { GET as cronHandler } from '../src/app/api/cron/retencao/route';
import { NextRequest } from 'next/server';

describe('Retenção de 1 ano e Logs Seguros (Tarefa 8)', () => {
  beforeEach(() => {
    dataStore.reset();
  });

  it('documento vencido tem arquivo removido e snapshot nulo', async () => {
    const agora = new Date('2026-10-27T10:00:00Z');
    const docId = 'doc-expirado-123';
    const filePath = 'gerados/batch-1/doc-expirado-123.docx';

    // Simula arquivo em disco/storage
    dataStore.storageFiles.set(filePath, new Uint8Array([1, 2, 3]));

    // Cria registro expirado há 1 dia
    dataStore.generatedDocs.set(docId, {
      id: docId,
      batch_id: 'batch-1',
      document_id: 'doc_procuracao',
      document_name: 'Procuração Ad Judicia',
      user_id: 'user-carlos-adv',
      user_name: 'Dr. Carlos Mendes',
      client_masked_name: 'Maria S.',
      file_path: filePath,
      status: 'ativo',
      snapshot: { cliente: 'dados-sensiveis' },
      expires_at: '2026-10-26T10:00:00Z', // vencido ontem
      created_at: '2025-10-26T10:00:00Z',
    });

    // Registra log de auditoria
    dataStore.auditLogs.push({
      id: 'audit-1',
      user_id: 'user-carlos-adv',
      user_name: 'Dr. Carlos Mendes',
      action: 'geracao_kit',
      target_id: 'batch-1',
      created_at: '2025-10-26T10:00:00Z',
    });

    const res = await purgeExpired(agora);
    expect(res.removidos).toBe(1);

    const docApos = dataStore.generatedDocs.get(docId);
    expect(docApos?.status).toBe('expirado');
    expect(docApos?.snapshot).toBeNull();
    // Arquivo físico foi expurgado
    expect(dataStore.storageFiles.has(filePath)).toBe(false);

    // Audit log permanece íntegro
    expect(dataStore.auditLogs).toHaveLength(1);
    expect(dataStore.auditLogs[0].id).toBe('audit-1');
  });

  it('documento a 29 dias mostra aviso de expiração, a 31 dias não', () => {
    const hoje = new Date('2026-10-27T12:00:00Z');

    // 29 dias restantes
    const data29Dias = new Date(hoje.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString();
    const dias29 = diasParaExpirar(data29Dias, hoje);
    expect(dias29).toBeLessThanOrEqual(30);

    // 31 dias restantes
    const data31Dias = new Date(hoje.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString();
    const dias31 = diasParaExpirar(data31Dias, hoje);
    expect(dias31).toBeGreaterThan(30);
  });

  it('rota de cron sem CRON_SECRET retorna 401 não autorizado', async () => {
    process.env.CRON_SECRET = 'segredo-oficial-123';

    // Requisição sem cabeçalho Authorization
    const reqSemAuth = new NextRequest('http://localhost:3000/api/cron/retencao');
    const resSemAuth = await cronHandler(reqSemAuth);
    expect(resSemAuth.status).toBe(401);

    // Requisição com Authorization errado
    const reqErrada = new NextRequest('http://localhost:3000/api/cron/retencao', {
      headers: { authorization: 'Bearer segredo-incorreto' },
    });
    const resErrada = await cronHandler(reqErrada);
    expect(resErrada.status).toBe(401);

    // Requisição com Authorization correto
    const reqCorreta = new NextRequest('http://localhost:3000/api/cron/retencao', {
      headers: { authorization: 'Bearer segredo-oficial-123' },
    });
    const resCorreta = await cronHandler(reqCorreta);
    expect(resCorreta.status).toBe(200);
    const json = await resCorreta.json();
    expect(json.ok).toBe(true);
  });
});

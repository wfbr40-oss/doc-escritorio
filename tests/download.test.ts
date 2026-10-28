import { describe, it, expect, beforeEach } from 'vitest';
import { GET as downloadHandler } from '../src/app/api/download/[id]/route';
import { dataStore } from '../src/lib/supabase/store';
import { setTestSession } from '../src/lib/supabase/session';
import { NextRequest } from 'next/server';

describe('Histórico e Download Seguro (Tarefa 7)', () => {
  beforeEach(() => {
    dataStore.reset();
  });

  const sessionAtiva = {
    id: 'user-carlos-adv',
    name: 'Dr. Carlos Mendes',
    role: 'user' as const,
    email: 'carlos@escritorio.adv.br',
  };

  it('sem sessão retorna 401 não autorizado', async () => {
    setTestSession(null);
    const req = new NextRequest('http://localhost:3000/api/download/qualquer-id');
    const res = await downloadHandler(req, {
      params: Promise.resolve({ id: 'qualquer-id' }),
    });
    expect(res.status).toBe(401);
  });

  it('download gera linha no audit_log sem campos de dados pessoais', async () => {
    setTestSession(sessionAtiva);
    const docId = 'doc-teste-download';
    const filePath = 'gerados/batch-1/doc-teste-download.docx';

    dataStore.storageFiles.set(filePath, new Uint8Array([10, 20, 30]));
    dataStore.generatedDocs.set(docId, {
      id: docId,
      batch_id: 'batch-1',
      document_id: 'doc_procuracao',
      document_name: 'Procuração',
      user_id: sessionAtiva.id,
      user_name: sessionAtiva.name,
      client_masked_name: 'Maria S.',
      file_path: filePath,
      status: 'ativo',
      snapshot: { test: true },
      expires_at: '2027-10-27T10:00:00Z',
      created_at: '2026-10-27T10:00:00Z',
    });

    const req = new NextRequest(`http://localhost:3000/api/download/${docId}`);
    const res = await downloadHandler(req, {
      params: Promise.resolve({ id: docId }),
    });

    expect(res.status).toBe(200);

    // Verifica audit_log
    const log = dataStore.auditLogs.find((l) => l.action === 'download' && l.target_id === docId);
    expect(log).toBeDefined();
    expect(log?.user_id).toBe(sessionAtiva.id);

    // Garante que nenhum dado pessoal de cliente (CPF, nome completo, endereço) foi gravado no audit_log
    const logStr = JSON.stringify(log);
    expect(logStr).not.toContain('cpf');
    expect(logStr).not.toContain('52998224725');
    expect(logStr).not.toContain('Rua');
  });

  it('documento com status expirado retorna 410', async () => {
    setTestSession(sessionAtiva);
    const docId = 'doc-expirado';

    dataStore.generatedDocs.set(docId, {
      id: docId,
      batch_id: 'batch-1',
      document_id: 'doc_procuracao',
      document_name: 'Procuração',
      user_id: sessionAtiva.id,
      user_name: sessionAtiva.name,
      client_masked_name: 'Maria S.',
      file_path: 'gerados/batch-1/doc-expirado.docx',
      status: 'expirado',
      snapshot: null,
      expires_at: '2026-10-26T10:00:00Z',
      created_at: '2025-10-26T10:00:00Z',
    });

    const req = new NextRequest(`http://localhost:3000/api/download/${docId}`);
    const res = await downloadHandler(req, {
      params: Promise.resolve({ id: docId }),
    });

    expect(res.status).toBe(410);
  });

  it('editar clause_variants depois não altera o arquivo já gerado (histórico congelado)', async () => {
    setTestSession(sessionAtiva);
    const docId = 'doc-congelado';
    const filePath = 'gerados/batch-1/doc-congelado.docx';

    const conteudoOriginal = new Uint8Array([1, 2, 3, 4, 5]);
    dataStore.storageFiles.set(filePath, conteudoOriginal);

    dataStore.generatedDocs.set(docId, {
      id: docId,
      batch_id: 'batch-1',
      document_id: 'doc_contrato_honorarios',
      document_name: 'Contrato',
      user_id: sessionAtiva.id,
      user_name: sessionAtiva.name,
      client_masked_name: 'Maria S.',
      file_path: filePath,
      status: 'ativo',
      snapshot: { clausula: 'versao antiga' },
      expires_at: '2027-10-27T10:00:00Z',
      created_at: '2026-10-27T10:00:00Z',
    });

    // Modifica uma variante de cláusula no banco/store posteriormente
    const variant = Array.from(dataStore.variants.values())[0];
    if (variant) {
      variant.text_paragraphs = ['TEXTO COMPLETAMENTE MODIFICADO ANOS DEPOIS'];
    }

    // Baixa o arquivo previamente gerado
    const req = new NextRequest(`http://localhost:3000/api/download/${docId}`);
    const res = await downloadHandler(req, {
      params: Promise.resolve({ id: docId }),
    });

    expect(res.status).toBe(200);
    const body = new Uint8Array(await res.arrayBuffer());

    // O arquivo entregue é o binário original intocado
    expect(body).toEqual(conteudoOriginal);
  });
});

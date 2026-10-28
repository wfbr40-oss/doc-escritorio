import { describe, it, expect, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { POST as generateHandler } from '../src/app/api/generate/route';
import { dataStore } from '../src/lib/supabase/store';
import { setTestSession } from '../src/lib/supabase/session';
import { NextRequest } from 'next/server';

describe('Geração de Documentos e API (Tarefa 6)', () => {
  beforeEach(() => {
    dataStore.reset();
    setTestSession({
      id: 'user-carlos-adv',
      name: 'Dr. Carlos Mendes',
      role: 'user',
      email: 'carlos@escritorio.adv.br',
    });
  });

  const clienteF = {
    nome: 'Maria Francisca da Silva',
    genero: 'F' as const,
    nacionalidade: 'brasileira',
    estadoCivil: 'solteiro' as const,
    profissao: 'Agricultora',
    cpf: '52998224725',
    endereco: 'Linha Rural 4',
    numero: '120',
    bairro: 'Zona Rural',
    cidadeUf: 'Macapá/AP',
    cep: '68925000',
  };

  it('CPF inválido retorna 422 e não cria registros no banco', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        cliente: {
          ...clienteF,
          cpf: '111.111.111-11', // CPF comprovadamente inválido
        },
        documentos: [{ documentId: 'doc_procuracao' }],
      }),
    });

    const res = await generateHandler(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.campo).toBe('cpf');
    // Nenhum documento deve ter sido registrado
    expect(dataStore.generatedDocs.size).toBe(0);
  });

  it('cliente F gera procuração com "inscrita"', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        cliente: clienteF,
        documentos: [{ documentId: 'doc_procuracao' }],
      }),
    });

    const res = await generateHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.itens).toHaveLength(1);

    const recordId = json.itens[0].id;
    const docObj = dataStore.generatedDocs.get(recordId);
    expect(docObj).toBeDefined();

    const fileBytes = dataStore.storageFiles.get(docObj!.file_path);
    expect(fileBytes).toBeDefined();

    const zip = await JSZip.loadAsync(fileBytes!);
    const xml = await zip.file('word/document.xml')?.async('string');
    expect(xml).toContain('inscrita no CPF sob o n°');
  });

  it('duas gerações simultâneas criam dois batchId e arquivos distintos sem sobrescrita', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        cliente: clienteF,
        documentos: [{ documentId: 'doc_procuracao' }],
      }),
    });

    const req2 = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        cliente: clienteF,
        documentos: [{ documentId: 'doc_procuracao' }],
      }),
    });

    const [res1, res2] = await Promise.all([generateHandler(req1), generateHandler(req2)]);

    const json1 = await res1.json();
    const json2 = await res2.json();

    expect(json1.batchId).not.toBe(json2.batchId);
    expect(json1.itens[0].filePath).not.toBe(json2.itens[0].filePath);
    expect(dataStore.generatedDocs.size).toBe(2);
  });

  it('zip do kit completo contém os 7 DOCX gerados e o Cadastro estático', async () => {
    // Todos os 8 documentos do kit previdenciário
    const todosDocs = [
      { documentId: 'doc_procuracao' },
      { documentId: 'doc_contrato_honorarios', varianteId: 'padrao' },
      { documentId: 'doc_hipossuficiencia' },
      { documentId: 'doc_renuncia_jef' },
      { documentId: 'doc_requerimento_inss' },
      { documentId: 'doc_ciencia_tramitacao' },
      { documentId: 'doc_declaracao_residencia' },
      { documentId: 'doc_cadastro_estatico' },
    ];

    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        cliente: clienteF,
        documentos: todosDocs,
      }),
    });

    const res = await generateHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(8);

    const zipBytes = dataStore.storageFiles.get(`gerados/${json.batchId}/kit_completo.zip`);
    expect(zipBytes).toBeDefined();

    const kitZip = await JSZip.loadAsync(zipBytes!);
    const arquivosNoZip = Object.keys(kitZip.files).filter((f) => f.endsWith('.docx'));
    expect(arquivosNoZip).toHaveLength(8);
  });
});

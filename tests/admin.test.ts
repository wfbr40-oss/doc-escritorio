import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { dataStore } from '@/src/lib/supabase/store';
import { setTestSession } from '@/src/lib/supabase/session';
import { GET as overviewGet } from '@/src/app/api/admin/overview/route';
import { POST as createKitPost } from '@/src/app/api/admin/kits/route';
import { PATCH as patchKit, DELETE as deleteKit } from '@/src/app/api/admin/kits/[id]/route';
import { POST as createModelPost } from '@/src/app/api/admin/models/route';
import {
  PATCH as patchModel,
  DELETE as deleteModel,
} from '@/src/app/api/admin/models/[id]/route';
import { POST as createUserPost } from '@/src/app/api/admin/users/route';
import { PATCH as patchUser } from '@/src/app/api/admin/users/[id]/route';
import { GET as catalogGet } from '@/src/app/api/catalog/route';
import { POST as generatePost } from '@/src/app/api/generate/route';

describe('Administração de Modelos, Kits e Usuários', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    dataStore.reset();
    setTestSession(undefined);
  });

  it('recusa acesso não autenticado (401) e usuário comum (403) nas rotas de administração', async () => {
    setTestSession(null);
    const rAnon = await overviewGet();
    expect(rAnon.status).toBe(401);

    setTestSession({
      id: 'user-carlos-adv',
      name: 'Dr. Carlos Mendes',
      role: 'user',
    });

    const rUserOverview = await overviewGet();
    expect(rUserOverview.status).toBe(403);

    const rUserKit = await createKitPost(
      new NextRequest('http://localhost:3000/api/admin/kits', {
        method: 'POST',
        body: JSON.stringify({ name: 'Kit Não Autorizado' }),
      })
    );
    expect(rUserKit.status).toBe(403);

    const rUserModel = await createModelPost(
      new NextRequest('http://localhost:3000/api/admin/models', {
        method: 'POST',
        body: JSON.stringify({ name: 'Modelo Bloqueado', kit_id: 'kit_previdenciario' }),
      })
    );
    expect(rUserModel.status).toBe(403);

    const rUserPerm = await patchUser(
      new NextRequest('http://localhost:3000/api/admin/users/user-carlos-adv', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'admin' }),
      }),
      { params: Promise.resolve({ id: 'user-carlos-adv' }) }
    );
    expect(rUserPerm.status).toBe(403);
  });

  it('admin cria novo kit, adiciona/modifica/exclui modelo DOCX e gera documento atualizado', async () => {
    setTestSession({
      id: 'user-amanda-admin',
      name: 'Dra. Amanda Oliveira',
      role: 'admin',
    });

    // 1. Criar novo kit
    const kitRes = await createKitPost(
      new NextRequest('http://localhost:3000/api/admin/kits', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Kit BPC LOAS Especial',
          description: 'Documentos específicos para benefício assistencial.',
        }),
      })
    );
    expect(kitRes.status).toBe(201);
    const kitBody = await kitRes.json();
    const novoKitId = kitBody.kit.id as string;
    expect(dataStore.kits.has(novoKitId)).toBe(true);

    // 2. Adicionar modelo com texto estruturado
    const modelRes = await createModelPost(
      new NextRequest('http://localhost:3000/api/admin/models', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Declaração de Composição Familiar BPC',
          kit_id: novoKitId,
          kind: 'template',
          order_index: 1,
          titulo: 'DECLARAÇÃO DE GRUPO FAMILIAR',
          paragrafos: [
            'Requerente: {{CLIENTE_NOME}}, CPF {{CLIENTE_CPF}}.',
            'Assinado em {{ASSINATURA_LOCAL_DATA}}.',
          ],
        }),
      })
    );
    expect(modelRes.status).toBe(201);
    const modelBody = await modelRes.json();
    const novoDocId = modelBody.document.id as string;

    // 3. Modificar modelo recém-criado
    const patchRes = await patchModel(
      new NextRequest(`http://localhost:3000/api/admin/models/${novoDocId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Declaração de Composição Familiar BPC Atualizada',
          paragrafos: [
            'Requerente BPC/LOAS: {{CLIENTE_NOME}}, {{CLIENTE_QUALIFICACAO}}.',
            'Local e data: {{ASSINATURA_LOCAL_DATA}}.',
          ],
        }),
      }),
      { params: Promise.resolve({ id: novoDocId }) }
    );
    expect(patchRes.status).toBe(200);
    expect(dataStore.documents.get(novoDocId)?.name).toBe(
      'Declaração de Composição Familiar BPC Atualizada'
    );

    // 4. Gerar documento usando o modelo customizado
    const genRes = await generatePost(
      new NextRequest('http://localhost:3000/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          kitId: novoKitId,
          cliente: {
            nome: 'Maria Francisca da Silva',
            genero: 'F',
            nacionalidade: 'brasileira',
            estadoCivil: 'solteiro',
            profissao: 'Agricultora',
            cpf: '529.982.247-25',
            endereco: 'Rua das Flores',
            numero: '120',
            bairro: 'Centro',
            cidadeUf: 'Macapá/AP',
            cep: '68900-010',
          },
          documentos: [{ documentId: novoDocId }],
        }),
      })
    );
    expect(genRes.status).toBe(200);
    const genData = await genRes.json();
    const docGerado = dataStore.generatedDocs.get(genData.itens[0].id);
    expect(docGerado?.file_bytes).toBeDefined();

    const zip = await JSZip.loadAsync(docGerado!.file_bytes!);
    const docXml = await zip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('Requerente BPC/LOAS: Maria Francisca da Silva');

    // 5. Excluir modelo e kit
    const delModelRes = await deleteModel(
      new NextRequest(`http://localhost:3000/api/admin/models/${novoDocId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: novoDocId }) }
    );
    expect(delModelRes.status).toBe(200);
    expect(dataStore.documents.has(novoDocId)).toBe(false);

    const patchKitRes = await patchKit(
      new NextRequest(`http://localhost:3000/api/admin/kits/${novoKitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Kit BPC LOAS Editado' }),
      }),
      { params: Promise.resolve({ id: novoKitId }) }
    );
    expect(patchKitRes.status).toBe(200);

    const delKitRes = await deleteKit(
      new NextRequest(`http://localhost:3000/api/admin/kits/${novoKitId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: novoKitId }) }
    );
    expect(delKitRes.status).toBe(200);
    expect(dataStore.kits.has(novoKitId)).toBe(false);
  });

  it('admin cria usuário, configura acesso a kits específicos e protege contra auto-rebaixamento', async () => {
    setTestSession({
      id: 'user-amanda-admin',
      name: 'Dra. Amanda Oliveira',
      role: 'admin',
    });

    // Cria segundo kit
    const kitRes = await createKitPost(
      new NextRequest('http://localhost:3000/api/admin/kits', {
        method: 'POST',
        body: JSON.stringify({ name: 'Kit Restrito Admin' }),
      })
    );
    const kitIdRestrito = (await kitRes.json()).kit.id as string;

    // Cria usuário novo
    const userRes = await createUserPost(
      new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Dr. Roberto Lima',
          email: 'roberto@escritorio.adv.br',
          password: 'SenhaForte123',
          role: 'user',
          ativo: true,
          allowed_kit_ids: ['kit_previdenciario'],
        }),
      })
    );
    expect(userRes.status).toBe(201);
    const userCreated = (await userRes.json()).user;

    // Impede auto-rebaixamento ou auto-bloqueio
    const selfDemote = await patchUser(
      new NextRequest('http://localhost:3000/api/admin/users/user-amanda-admin', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'user' }),
      }),
      { params: Promise.resolve({ id: 'user-amanda-admin' }) }
    );
    expect(selfDemote.status).toBe(400);

    // Verifica que usuário restrito enxerga apenas o kit permitido no catálogo
    setTestSession({
      id: userCreated.id,
      name: userCreated.name,
      role: 'user',
      allowed_kit_ids: ['kit_previdenciario'],
    });
    const catRes = await catalogGet();
    const catData = await catRes.json();
    expect(catData.kits.some((k: { id: string }) => k.id === 'kit_previdenciario')).toBe(true);
    expect(catData.kits.some((k: { id: string }) => k.id === kitIdRestrito)).toBe(false);
  });

  it('aceita upload de arquivo .docx válido e recusa outro tipo de arquivo especificando .docx', async () => {
    setTestSession({
      id: 'user-amanda-admin',
      name: 'Dra. Amanda Oliveira',
      role: 'admin',
    });

    // 1. Rejeita arquivo .pdf especificando que deve ser em .docx
    const pdfForm = new FormData();
    pdfForm.append('name', 'Modelo PDF Inválido');
    pdfForm.append('kit_id', 'kit_previdenciario');
    pdfForm.append('kind', 'template');
    pdfForm.append(
      'file',
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'contrato.pdf', {
        type: 'application/pdf',
      })
    );

    const reqInvalid = {
      headers: new Headers({ 'content-type': 'multipart/form-data' }),
      formData: async () => pdfForm,
    } as unknown as NextRequest;

    const resInvalid = await createModelPost(reqInvalid);
    expect(resInvalid.status).toBe(400);
    const bodyInvalid = await resInvalid.json();
    expect(bodyInvalid.erro.toLowerCase()).toContain('.docx');

    // 2. Aceita arquivo .docx válido via FormData
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{CLIENTE_NOME}}</w:t></w:r></w:p></w:body></w:document>'
    );
    const docxBytes = await zip.generateAsync({ type: 'uint8array' });

    const docxForm = new FormData();
    docxForm.append('name', 'Requerimento Anexado DOCX');
    docxForm.append('kit_id', 'kit_previdenciario');
    docxForm.append('kind', 'template');
    docxForm.append(
      'file',
      new File([docxBytes.buffer as ArrayBuffer], 'requerimento.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    );

    const reqValid = {
      headers: new Headers({ 'content-type': 'multipart/form-data' }),
      formData: async () => docxForm,
    } as unknown as NextRequest;

    const resValid = await createModelPost(reqValid);
    expect(resValid.status).toBe(201);
    const bodyValid = await resValid.json();
    expect(dataStore.documents.has(bodyValid.document.id)).toBe(true);
    expect(dataStore.storageFiles.has(bodyValid.document.template_file_path)).toBe(true);
  });
});

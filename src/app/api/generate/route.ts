import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import JSZip from 'jszip';
import { getSessionProfile } from '@/src/lib/supabase/session';
import { isValidCpf } from '@/src/lib/cliente/cpf';
import { ClienteRender } from '@/src/lib/cliente/qualificacao';
import { montarRenderData, AjustesPontuais } from '@/src/lib/modelos/montar';
import { renderDocx } from '@/src/lib/docx/render';
import {
  ensureDocumentExistsInSupabase,
  isKitAllowedForUser,
  obterMolduraDocumento,
  syncCatalogFromSupabase,
} from '@/src/lib/modelos/catalog';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, INITIAL_DOCUMENTS } from '@/src/lib/supabase/store';
import { logSeguro } from '@/src/lib/logs/seguro';

export interface SolicitacaoItemDocumento {
  documentId: string;
  varianteId?: string;
  valores?: Record<string, string>;
  ajustes?: AjustesPontuais;
}

export interface SolicitacaoGeracao {
  cliente: ClienteRender;
  numeroInterno?: string;
  kitId?: string;
  documentos: SolicitacaoItemDocumento[];
  assinatura?: {
    cidadeUf?: string;
    dataExtenso?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionProfile();
    if (!session) {
      return NextResponse.json(
        { erro: 'Acesso não autorizado. É necessário estar autenticado.' },
        { status: 401 }
      );
    }

    await syncCatalogFromSupabase({ seedIfEmpty: session.role === 'admin' });

    const body: SolicitacaoGeracao = await req.json();
    const { cliente, kitId = 'kit_previdenciario', documentos, assinatura } = body;

    if (!isKitAllowedForUser(kitId, session)) {
      return NextResponse.json(
        { erro: 'Você não possui permissão para gerar documentos deste kit.' },
        { status: 403 }
      );
    }

    // 1. Validação estrita dos dados do cliente
    if (!cliente) {
      return NextResponse.json(
        { erro: 'Dados do cliente são obrigatórios.' },
        { status: 422 }
      );
    }

    if (!cliente.nome || cliente.nome.trim().length < 3) {
      return NextResponse.json(
        { erro: 'O nome do cliente é obrigatório e deve ter no mínimo 3 caracteres.', campo: 'nome' },
        { status: 422 }
      );
    }

    if (!cliente.genero || (cliente.genero !== 'M' && cliente.genero !== 'F')) {
      return NextResponse.json(
        { erro: 'O gênero do cliente (M ou F) é de seleção obrigatória para a correta qualificação jurídica.', campo: 'genero' },
        { status: 422 }
      );
    }

    if (!cliente.cpf || !isValidCpf(cliente.cpf)) {
      return NextResponse.json(
        { erro: 'O CPF informado é inválido. Verifique os números digitados.', campo: 'cpf' },
        { status: 422 }
      );
    }

    if (!cliente.endereco || !cliente.cidadeUf || !cliente.cep) {
      return NextResponse.json(
        { erro: 'Endereço, Cidade/UF e CEP são obrigatórios.', campo: 'endereco' },
        { status: 422 }
      );
    }

    if (!documentos || !Array.isArray(documentos) || documentos.length === 0) {
      return NextResponse.json(
        { erro: 'Ao menos um documento deve ser selecionado para geração.' },
        { status: 422 }
      );
    }

    // 2. Geração de IDs e Lote único
    const batchId = crypto.randomUUID();
    const agora = new Date();
    // Retenção: exatamente 1 ano a partir da data de geração
    const expiresAt = new Date(agora.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const zip = new JSZip();

    const itensGerados: Array<{
      id: string;
      documentId: string;
      nome: string;
      filePath: string;
    }> = [];

    const itemIdsParaLog: string[] = [];

    // Nome mascarado do cliente para o histórico (sem expor CPF nem dados sensíveis)
    const partesNome = cliente.nome.trim().split(' ');
    const maskedClientName =
      partesNome.length > 1
        ? `${partesNome[0]} ${partesNome[partesNome.length - 1]}`
        : partesNome[0];

    const rawNumeroInterno =
      typeof cliente.numeroInterno === 'string'
        ? cliente.numeroInterno
        : typeof body.numeroInterno === 'string'
          ? body.numeroInterno
          : '';
    const clientInternalNumber = rawNumeroInterno.trim().slice(0, 60) || undefined;

    const supabase = isSupabaseConfigured() ? await createClient() : null;

    // 3. Processamento de cada documento
    for (const docSolicitado of documentos) {
      const docDef =
        dataStore.documents.get(docSolicitado.documentId) ||
        INITIAL_DOCUMENTS.find((d) => d.id === docSolicitado.documentId);

      if (!docDef) continue;

      if (!isKitAllowedForUser(docDef.kit_id, session)) {
        return NextResponse.json(
          { erro: 'Você não possui permissão para acessar um dos modelos selecionados.' },
          { status: 403 }
        );
      }

      const recordId = crypto.randomUUID();
      itemIdsParaLog.push(recordId);

      // Regra de segurança: Cada arquivo gerado usa o id do registro no nome (nunca o nome do cliente)
      const filePath = `gerados/${batchId}/${recordId}.docx`;
      let fileBytes: Uint8Array;
      let snapshotData: Record<string, unknown> | null = null;

      if (docDef.kind === 'static') {
        // Documento estático: Cadastro de cliente em branco, entregue sem alteração
        fileBytes = await obterMolduraDocumento(docDef);
        snapshotData = {
          documentId: docDef.id,
          tipo: 'static',
          geradoEm: agora.toISOString(),
        };
      } else {
        // Documento dinâmico (template)
        const renderData = await montarRenderData(
          docDef.id,
          docSolicitado.varianteId || 'padrao',
          cliente,
          docSolicitado.valores || {},
          {
            ...docSolicitado.ajustes,
            assinatura: {
              cidadeUf: assinatura?.cidadeUf,
              dataExtenso: assinatura?.dataExtenso,
            },
          }
        );

        const molduraBytes = await obterMolduraDocumento(docDef);
        fileBytes = await renderDocx(molduraBytes, renderData);

        snapshotData = {
          documentId: docDef.id,
          varianteId: docSolicitado.varianteId || 'padrao',
          valores: renderData.valores,
          assinatura: renderData.assinatura,
          geradoEm: agora.toISOString(),
        };
      }

      const enrichedSnapshot = {
        ...snapshotData,
        documentName: docDef.name,
        userName: session.name,
        clientMaskedName: maskedClientName,
        ...(clientInternalNumber ? { clientInternalNumber } : {}),
      };

      // Persiste no Supabase Storage ('gerados') e tabela generated_documents quando configurado
      if (supabase) {
        try {
          if (session.role === 'admin') {
            await ensureDocumentExistsInSupabase(supabase, docDef);
          }

          const storageObjectPath = `${batchId}/${recordId}.docx`;
          await supabase.storage.from('gerados').upload(storageObjectPath, fileBytes, {
            contentType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: false,
          });

          const { error: genErr } = await supabase.from('generated_documents').insert({
            id: recordId,
            batch_id: batchId,
            document_id: docDef.id,
            user_id: session.id,
            snapshot: enrichedSnapshot,
            file_path: filePath,
            status: 'ativo',
            expires_at: expiresAt,
            created_at: agora.toISOString(),
          });

          if (genErr) {
            logSeguro('geracao_supabase_insert_aviso', {
              userId: session.id,
              documentId: docDef.id,
              erro: genErr.message,
            });
          }
        } catch {
          // Mantém fallback em memória caso Storage/tabela ainda não tenham sido provisionados
        }
      }

      // Armazena no dataStore em memória
      dataStore.storageFiles.set(filePath, fileBytes);

      dataStore.generatedDocs.set(recordId, {
        id: recordId,
        batch_id: batchId,
        document_id: docDef.id,
        document_name: docDef.name,
        user_id: session.id,
        user_name: session.name,
        client_masked_name: maskedClientName,
        ...(clientInternalNumber ? { client_internal_number: clientInternalNumber } : {}),
        file_path: filePath,
        status: 'ativo',
        snapshot: enrichedSnapshot,
        file_bytes: fileBytes,
        expires_at: expiresAt,
        created_at: agora.toISOString(),
      });

      // Adiciona ao arquivo ZIP do kit
      const nomeAmigavelZip = `${String(docDef.order_index).padStart(2, '0')}_${docDef.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      zip.file(nomeAmigavelZip, fileBytes);

      itensGerados.push({
        id: recordId,
        documentId: docDef.id,
        nome: docDef.name,
        filePath,
      });
    }

    // 4. Gera arquivo .ZIP completo do kit
    const zipBytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
    });

    const zipFilePath = `gerados/${batchId}/kit_completo.zip`;
    dataStore.storageFiles.set(zipFilePath, zipBytes);

    if (supabase) {
      try {
        await supabase.storage
          .from('gerados')
          .upload(`${batchId}/kit_completo.zip`, zipBytes, {
            contentType: 'application/zip',
            upsert: false,
          });

        await supabase.from('audit_log').insert({
          user_id: session.id,
          action: 'geracao_kit',
          target_id: batchId,
          metadata: {
            totalDocumentos: itensGerados.length,
          },
        });
      } catch {
        // Melhor esforço
      }
    }

    // 5. Registro de Auditoria e Log Seguro (sem PII de cliente)
    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: session.id,
      user_name: session.name,
      action: 'geracao_kit',
      target_id: batchId,
      metadata: {
        totalDocumentos: itensGerados.length,
      },
      created_at: agora.toISOString(),
    });

    logSeguro('kit_previdenciario_gerado', {
      batchId,
      userId: session.id,
      ids: itemIdsParaLog,
    });

    return NextResponse.json({
      ok: true,
      batchId,
      expiresAt,
      total: itensGerados.length,
      itens: itensGerados,
      zipDownloadUrl: `/api/download/batch/${batchId}`,
    });
  } catch (error) {
    logSeguro('geracao_erro_inesperado', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Ocorreu um erro ao gerar os documentos do kit previdenciário.' },
      { status: 500 }
    );
  }
}

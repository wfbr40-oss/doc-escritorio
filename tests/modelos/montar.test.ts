import { describe, it, expect, beforeEach } from 'vitest';
import { carregarModelos } from '../../scripts/carregar-modelos';
import { montarRenderData } from '../../src/lib/modelos/montar';
import { dataStore } from '../../src/lib/supabase/store';
import { ClienteRender } from '../../src/lib/cliente/qualificacao';

describe('Carga de Modelos e Montagem de RenderData (Tarefa 5)', () => {
  beforeEach(() => {
    dataStore.reset();
  });

  const clienteExemplo: ClienteRender = {
    nome: 'Maria Francisca da Silva',
    genero: 'F',
    nacionalidade: 'brasileira',
    estadoCivil: 'solteiro',
    profissao: 'Agricultora',
    cpf: '52998224725',
    endereco: 'Linha Rural 4, Km 12',
    numero: 'S/N',
    bairro: 'Zona Rural',
    cidadeUf: 'Macapá/AP',
    cep: '68925000',
  };

  it('rodar duas vezes carregarModelos é idempotente e não duplica registros', async () => {
    const res1 = await carregarModelos();
    const countDocs1 = dataStore.documents.size;
    const countClauses1 = dataStore.clauses.size;

    const res2 = await carregarModelos();
    const countDocs2 = dataStore.documents.size;
    const countClauses2 = dataStore.clauses.size;

    expect(countDocs1).toBe(countDocs2);
    expect(countClauses1).toBe(countClauses2);
    expect(res1.totalDocumentos).toBe(res2.totalDocumentos);
  });

  it('kit previdenciário tem exatamente 8 documentos, sendo 1 estático', async () => {
    await carregarModelos();

    const docs = Array.from(dataStore.documents.values()).filter(
      (d) => d.kit_id === 'kit_previdenciario'
    );
    expect(docs).toHaveLength(8);

    const estaticos = docs.filter((d) => d.kind === 'static');
    const templates = docs.filter((d) => d.kind === 'template');

    expect(estaticos).toHaveLength(1);
    expect(templates).toHaveLength(7);
    expect(estaticos[0].id).toBe('doc_cadastro_estatico');
  });

  it('montarRenderData troca somente as cláusulas da variante escolhida', async () => {
    await carregarModelos();

    // 1. Monta variante padrão
    const renderPadrao = await montarRenderData(
      'doc_contrato_honorarios',
      'padrao',
      clienteExemplo
    );

    expect(renderPadrao.clausulas.honorarios).toBeDefined();
    const textoHonorariosPadrao = renderPadrao.clausulas.honorarios.join(' ');
    expect(textoHonorariosPadrao).toContain('30% (trinta por cento) sobre o proveito econômico');
    expect(renderPadrao.valores.minimo_honorarios).toBe('14.000,00');

    // 2. Monta variante auxilio_acidente_trafego_pago
    const renderTrafego = await montarRenderData(
      'doc_contrato_honorarios',
      'auxilio_acidente_trafego_pago',
      clienteExemplo,
      { minimo_honorarios: '5.000,00' }
    );

    const textoHonorariosTrafego = renderTrafego.clausulas.honorarios.join(' ');
    expect(textoHonorariosTrafego).toContain('doze vincendas');
    expect(renderTrafego.valores.minimo_honorarios).toBe('5.000,00');

    // As duas variantes geraram textos distintos de honorários
    expect(textoHonorariosPadrao).not.toBe(textoHonorariosTrafego);
  });

  it('ajuste pontual altera o RenderData e não altera clause_variants no banco/store', async () => {
    await carregarModelos();

    const variantOriginal = Array.from(dataStore.variants.values()).find(
      (v) => v.key === 'padrao' && v.clause_id.includes('honorarios')
    );
    const textoOriginal = variantOriginal?.text_paragraphs[0];

    const textoCustomizado = 'CLÁUSULA COM AJUSTE PONTUAL ÚNICO PARA ESTE CLIENTE.';

    const render = await montarRenderData(
      'doc_contrato_honorarios',
      'padrao',
      clienteExemplo,
      {},
      {
        clausulas: {
          honorarios: [textoCustomizado],
        },
      }
    );

    expect(render.clausulas.honorarios[0]).toBe(textoCustomizado);

    // Confere que a variante salva no banco/store PERMANECE INALTERADA
    const variantApos = Array.from(dataStore.variants.values()).find(
      (v) => v.key === 'padrao' && v.clause_id.includes('honorarios')
    );
    expect(variantApos?.text_paragraphs[0]).toBe(textoOriginal);
    expect(variantApos?.text_paragraphs[0]).not.toBe(textoCustomizado);
  });
});

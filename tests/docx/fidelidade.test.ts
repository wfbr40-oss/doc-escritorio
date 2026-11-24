import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { renderDocx, RenderData } from '../../src/lib/docx/render';
import { CLIENTE_FICTICIO_F, CLIENTE_FICTICIO_M } from '../fixtures/cliente-ficticio';
import {
  criarMolduraProcuracaoFicticia,
  criarMolduraContratoFicticio,
} from '../fixtures/molduras-ficticias';

describe('Teste de Fidelidade de DOCX (Tarefa 4 - Passo 1)', () => {
  it('renderiza fixture física procuracao-ad-judicia.docx preservando fonte, margens e estrutura OpenXML', async () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/procuracao-ad-judicia.docx');
    const moldura = new Uint8Array(fs.readFileSync(fixturePath));

    const data: RenderData = {
      cliente: CLIENTE_FICTICIO_F,
      valores: {},
      clausulas: {},
      assinatura: {
        cidadeUf: 'Santana/AP',
        dataExtenso: '24 de novembro de 2026',
      },
    };

    const gerado = await renderDocx(moldura, data);
    const zip = await JSZip.loadAsync(gerado);

    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(zip.file('word/styles.xml')).not.toBeNull();
    expect(zip.file('word/document.xml')).not.toBeNull();

    const stylesXml = await zip.file('word/styles.xml')!.async('string');
    const docXml = await zip.file('word/document.xml')!.async('string');

    expect(stylesXml).toContain('Times New Roman');
    expect(docXml).toContain('<w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701"/>');
    expect(docXml).toContain('Maria Helena Exemplo');
    expect(docXml).toContain('inscrita no CPF sob o n°');
    expect(docXml).toContain('Santana/AP, 24 de novembro de 2026');
    expect(docXml).not.toContain('{{');
  });

  it('desfragmenta marcadores divididos entre <w:r> com <w:proofErr/> e preserva caixas, header e footer', async () => {
    const moldura = await criarMolduraProcuracaoFicticia();

    const data: RenderData = {
      cliente: CLIENTE_FICTICIO_M,
      valores: {},
      clausulas: {},
      assinatura: {
        cidadeUf: 'Macapá/AP',
        dataExtenso: '24 de novembro de 2026',
      },
    };

    const gerado = await renderDocx(moldura, data);
    const zip = await JSZip.loadAsync(gerado);

    const docXml = await zip.file('word/document.xml')!.async('string');
    const hdrXml = await zip.file('word/header1.xml')!.async('string');
    const ftrXml = await zip.file('word/footer1.xml')!.async('string');

    // Caixa (tabela com bordas) e margens preservadas integralmente
    expect(docXml).toContain('<w:tblBorders>');
    expect(docXml).toContain('w:top="1701"');

    // Marcador {{CLIENTE_NOME}} que estava fragmentado em 4 runs foi reunido e substituído
    expect(docXml).toContain('João Carlos Fictício');
    expect(docXml).toContain('inscrito no CPF sob o n° 529.982.247-25');

    // Header e footer também foram preenchidos corretamente
    expect(hdrXml).toContain('João Carlos Fictício');
    expect(ftrXml).toContain('Macapá/AP, 24 de novembro de 2026');

    expect(docXml).not.toContain('{{');
    expect(hdrXml).not.toContain('{{');
    expect(ftrXml).not.toContain('{{');
  });

  it('renderiza {{CLAUSULA:honorarios}} com negrito inline e múltiplos parágrafos sem duplicar parágrafos anteriores', async () => {
    const moldura = await criarMolduraContratoFicticio();

    const data: RenderData = {
      cliente: CLIENTE_FICTICIO_F,
      valores: {
        minimo_honorarios: '14.000,00',
      },
      clausulas: {
        honorarios: [
          '**CLÁUSULA QUINTA (DOS HONORÁRIOS):** O contratante pagará **30% (trinta por cento)** sobre o proveito econômico.',
          'PARÁGRAFO ÚNICO: Valor mínimo estipulado em **R$ {{VALOR:minimo_honorarios}}**.',
        ],
      },
      assinatura: {
        cidadeUf: 'Santana/AP',
        dataExtenso: '24 de novembro de 2026',
      },
    };

    const gerado = await renderDocx(moldura, data);
    const zip = await JSZip.loadAsync(gerado);
    const docXml = await zip.file('word/document.xml')!.async('string');

    // Garante que o título anterior NÃO foi duplicado pelo loop da cláusula
    const ocorrenciasTitulo = docXml.match(/CONTRATO DE HONORÁRIOS/g) || [];
    expect(ocorrenciasTitulo).toHaveLength(1);

    // Garante que os dois parágrafos da cláusula existem e mantiveram a fonte da moldura
    expect(docXml).toContain('CLÁUSULA QUINTA (DOS HONORÁRIOS):');
    expect(docXml).toContain('30% (trinta por cento)');
    expect(docXml).toContain('R$ 14.000,00');
    expect(docXml).toContain('<w:b/>');
    expect(docXml).toContain('Times New Roman');
    expect(docXml).not.toContain('**');
    expect(docXml).not.toContain('{{');
  });
});

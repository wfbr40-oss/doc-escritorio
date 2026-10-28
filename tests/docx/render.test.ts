import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { renderDocx, MarcadorDesconhecidoError, RenderData } from '../../src/lib/docx/render';
import { createTemplateDocx } from '../../src/lib/docx/builder';

describe('Motor de DOCX (Tarefa 4)', () => {
  const clienteBase = {
    nome: 'João da Silva',
    genero: 'M' as const,
    nacionalidade: 'brasileiro',
    estadoCivil: 'solteiro' as const,
    profissao: 'Mecânico',
    cpf: '52998224725',
    endereco: 'Rua Principal',
    numero: '100',
    bairro: 'Centro',
    cidadeUf: 'Macapá/AP',
    cep: '68925000',
  };

  it('escapa caracteres especiais (D\'Ávila & Filhos <Ltda> "Teste") e mantém fidelidade no Word', async () => {
    const nomeEspecial = 'D\'Ávila & Filhos <Ltda> "Teste"';
    const moldura = await createTemplateDocx('PROCURAÇÃO AD JUDICIA', [
      'OUTORGANTE: {{CLIENTE_NOME}}',
      'QUALIFICAÇÃO: {{CLIENTE_QUALIFICACAO}}',
      'DATA: {{ASSINATURA_LOCAL_DATA}}',
    ]);

    const data: RenderData = {
      cliente: { ...clienteBase, nome: nomeEspecial },
      valores: {},
      clausulas: {},
      assinatura: {
        cidadeUf: 'Macapá/AP',
        dataExtenso: '27 de outubro de 2026',
      },
    };

    const docxBytes = await renderDocx(moldura, data);
    expect(docxBytes.length).toBeGreaterThan(0);

    // Valida que o zip é válido e o XML contém as entidades XML seguras
    const zip = await JSZip.loadAsync(docxBytes);
    const xml = await zip.file('word/document.xml')?.async('string');
    expect(xml).toBeDefined();
    expect(xml).toContain('D&apos;Ávila &amp; Filhos &lt;Ltda&gt; &quot;Teste&quot;');
    // E não contém o texto desprotegido <Ltda>
    expect(xml).not.toContain('<Ltda>');
  });

  it('suporta nomes longos com mais de 80 caracteres sem quebrar', async () => {
    const nomeLongo = 'Sebastião Pedro Francisco de Alcântara Gonzaga de Bragança e Bourbon Albuquerque da Silva Prado';
    expect(nomeLongo.length).toBeGreaterThan(80);

    const moldura = await createTemplateDocx('PROCURAÇÃO', [
      'OUTORGANTE: {{CLIENTE_NOME}}',
      'CPF: {{CLIENTE_CPF}}',
      'LOCAL: {{ASSINATURA_LOCAL_DATA}}',
    ]);

    const data: RenderData = {
      cliente: { ...clienteBase, nome: nomeLongo },
      valores: {},
      clausulas: {},
      assinatura: {
        cidadeUf: 'Macapá/AP',
        dataExtenso: '27 de outubro de 2026',
      },
    };

    const docxBytes = await renderDocx(moldura, data);
    const zip = await JSZip.loadAsync(docxBytes);
    const xml = await zip.file('word/document.xml')?.async('string');
    expect(xml).toContain(nomeLongo);
  });

  it('lança MarcadorDesconhecidoError quando moldura contém marcador desconhecido ou inexistente', async () => {
    const moldura = await createTemplateDocx('CONTRATO', [
      'Honorários: {{VALOR:inexistente}}',
      'Nome: {{CLIENTE_NOME}}',
    ]);

    const data: RenderData = {
      cliente: clienteBase,
      valores: {},
      clausulas: {},
      assinatura: {
        cidadeUf: 'Macapá/AP',
        dataExtenso: '27 de outubro de 2026',
      },
    };

    await expect(renderDocx(moldura, data)).rejects.toThrow(MarcadorDesconhecidoError);

    try {
      await renderDocx(moldura, data);
    } catch (err: unknown) {
      if (err instanceof MarcadorDesconhecidoError) {
        expect(err.marcadores).toContain('VALOR:inexistente');
      } else {
        throw err;
      }
    }
  });

  it('garante que o DOCX gerado não contém {{, undefined nem null', async () => {
    const moldura = await createTemplateDocx('DECLARAÇÃO DE HIPOSSUFICIÊNCIA', [
      'Eu, {{CLIENTE_NOME}}, inscrito no CPF sob o nº {{CLIENTE_CPF}}, declaro hipossuficiência.',
      'Data: {{ASSINATURA_LOCAL_DATA}}',
    ]);

    const data: RenderData = {
      cliente: clienteBase,
      valores: {},
      clausulas: {},
      assinatura: {
        cidadeUf: 'Macapá/AP',
        dataExtenso: '27 de outubro de 2026',
      },
    };

    const docxBytes = await renderDocx(moldura, data);
    const zip = await JSZip.loadAsync(docxBytes);
    const xml = await zip.file('word/document.xml')?.async('string');

    expect(xml).not.toContain('{{');
    expect(xml).not.toContain('}}');
    expect(xml).not.toContain('undefined');
    expect(xml).not.toContain('null');
  });

  it('{{CLAUSULA:honorarios}} com dois parágrafos produz dois parágrafos no documento', async () => {
    const moldura = await createTemplateDocx('CONTRATO DE HONORÁRIOS', [
      'CLÁUSULA PRIMEIRA: Do Objeto.',
      '{{CLAUSULA:honorarios}}',
      'CLÁUSULA TERCEIRA: Da Desistência.',
    ]);

    const p1 = 'Parágrafo 1: O contratante pagará 30% sobre o proveito econômico obtido.';
    const p2 = 'Parágrafo 2: Fica estipulado o valor mínimo de R$ 14.000,00.';

    const data: RenderData = {
      cliente: clienteBase,
      valores: {},
      clausulas: {
        honorarios: [p1, p2],
      },
      assinatura: {
        cidadeUf: 'Macapá/AP',
        dataExtenso: '27 de outubro de 2026',
      },
    };

    const docxBytes = await renderDocx(moldura, data);
    const zip = await JSZip.loadAsync(docxBytes);
    const xml = await zip.file('word/document.xml')?.async('string');

    expect(xml).toContain(p1);
    expect(xml).toContain(p2);

    // Verifica que existem ao menos 2 tags <w:p> para os parágrafos gerados
    const countP = (xml?.match(/<w:p(?: [^>]*)?>/g) || []).length;
    expect(countP).toBeGreaterThanOrEqual(4);
  });
});

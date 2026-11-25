import { formatCpf } from './cpf';
import { formatCep } from './cep';
import { Genero, flexionar, estadoCivil, EstadoCivilValor } from './genero';

export type { Genero, EstadoCivilValor };

export interface ClienteRender {
  nome: string;
  numeroInterno?: string;
  genero: Genero;
  nacionalidade: string;
  estadoCivil: EstadoCivilValor;
  profissao?: string;
  cpf: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidadeUf: string;
  cep: string;
  referencia?: string;
}

export const DEFAULT_QUALIFICACAO_CONTRATO =
  '{{CLIENTE_NOME}}, {{CLIENTE_NACIONALIDADE}}, {{CLIENTE_ESTADO_CIVIL}}, profissão {{CLIENTE_PROFISSAO}}, {{INSCRITO_FLEX}} no CPF sob o n° {{CLIENTE_CPF}}, residente e {{DOMICILIADO_FLEX}} em {{CLIENTE_ENDERECO}}, n° {{CLIENTE_NUMERO}}, Bairro {{CLIENTE_BAIRRO}}, {{CLIENTE_CIDADE_UF}}, CEP {{CLIENTE_CEP}}, ref.: {{CLIENTE_REFERENCIA}}';

export const DEFAULT_QUALIFICACAO_ROTULOS =
  'Nacionalidade: {{CLIENTE_NACIONALIDADE}}, Estado civil: {{CLIENTE_ESTADO_CIVIL}}, Profissão: {{CLIENTE_PROFISSAO}}, CPF: {{CLIENTE_CPF}}, Endereço: residente e {{DOMICILIADO_FLEX}} em {{CLIENTE_ENDERECO}}, n° {{CLIENTE_NUMERO}}, Bairro {{CLIENTE_BAIRRO}}, {{CLIENTE_CIDADE_UF}}, CEP {{CLIENTE_CEP}}, ref.: {{CLIENTE_REFERENCIA}}';

export function renderQualificacaoTemplate(
  template: string,
  c: ClienteRender
): string {
  const g = c.genero;
  const cpfFormatado = formatCpf(c.cpf);
  const cepFormatado = formatCep(c.cep);
  const estCivil = estadoCivil(c.estadoCivil, g);
  const inscritoFlex = flexionar('inscrito', g);
  const domiciliadoFlex = flexionar('domiciliado', g);

  let nac = c.nacionalidade?.trim() || 'brasileiro';
  if (nac.toLowerCase() === 'brasileiro' || nac.toLowerCase() === 'brasileira') {
    nac = flexionar('brasileiro', g);
  }

  const profTrim = c.profissao?.trim() || '';
  const numeroTrim = c.numero?.trim() || '';
  const bairroTrim = c.bairro?.trim() || '';
  const cidadeTrim = c.cidadeUf?.trim() || '';
  const refTrim = c.referencia?.trim() || '';

  let result = template;

  // Remove trechos rotulados opcionais quando o campo estiver vazio
  if (!profTrim) {
    result = result
      .replace(/,?\s*profiss[aã]o:?\s*\{\{CLIENTE_PROFISSAO\}\}/gi, '')
      .replace(/\{\{CLIENTE_PROFISSAO\}\}/g, '');
  }
  if (!numeroTrim) {
    result = result
      .replace(/,?\s*n[º°]\s*\{\{CLIENTE_NUMERO\}\}/gi, '')
      .replace(/\{\{CLIENTE_NUMERO\}\}/g, '');
  }
  if (!bairroTrim) {
    result = result
      .replace(/,?\s*bairro\s*\{\{CLIENTE_BAIRRO\}\}/gi, '')
      .replace(/\{\{CLIENTE_BAIRRO\}\}/g, '');
  }
  if (!refTrim) {
    result = result
      .replace(/,?\s*ref\.?:\s*\{\{CLIENTE_REFERENCIA\}\}/gi, '')
      .replace(/\{\{CLIENTE_REFERENCIA\}\}/g, '');
  }
  if (!cepFormatado) {
    result = result
      .replace(/,?\s*CEP\s*\{\{CLIENTE_CEP\}\}/gi, '')
      .replace(/\{\{CLIENTE_CEP\}\}/g, '');
  }

  const tokens: Record<string, string> = {
    CLIENTE_NOME: c.nome.trim(),
    CLIENTE_NACIONALIDADE: nac,
    CLIENTE_ESTADO_CIVIL: estCivil,
    CLIENTE_PROFISSAO: profTrim,
    CLIENTE_CPF: cpfFormatado,
    CLIENTE_ENDERECO: c.endereco.trim(),
    CLIENTE_NUMERO: numeroTrim,
    CLIENTE_BAIRRO: bairroTrim,
    CLIENTE_CIDADE_UF: cidadeTrim,
    CLIENTE_CEP: cepFormatado,
    CLIENTE_REFERENCIA: refTrim,
    INSCRITO_FLEX: inscritoFlex,
    DOMICILIADO_FLEX: domiciliadoFlex,
  };

  for (const [k, v] of Object.entries(tokens)) {
    result = result.replaceAll(`{{${k}}}`, v);
  }

  // Normaliza vírgulas e espaços residuais caso campos opcionais tenham sido omitidos
  return result
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
}

export function buildQualificacao(
  c: ClienteRender,
  formato: 'contrato' | 'rotulos',
  customTemplate?: string | null
): string {
  if (customTemplate && customTemplate.trim().length > 0) {
    return renderQualificacaoTemplate(customTemplate, c);
  }

  const g = c.genero;
  const cpfFormatado = formatCpf(c.cpf);
  const cepFormatado = formatCep(c.cep);
  const estCivil = estadoCivil(c.estadoCivil, g);
  const inscritoFlex = flexionar('inscrito', g);
  const domiciliadoFlex = flexionar('domiciliado', g);

  // Flexiona nacionalidade se for 'brasileiro' ou padrão
  let nac = c.nacionalidade?.trim() || 'brasileiro';
  if (nac.toLowerCase() === 'brasileiro' || nac.toLowerCase() === 'brasileira') {
    nac = flexionar('brasileiro', g);
  }

  // Montagem do endereço sempre com "em", sem artigo antes da rua
  const enderecoPartes: string[] = [`residente e ${domiciliadoFlex} em ${c.endereco.trim()}`];
  const numeroTrim = c.numero?.trim();
  if (numeroTrim) enderecoPartes.push(`n° ${numeroTrim}`);
  const bairroTrim = c.bairro?.trim();
  if (bairroTrim) enderecoPartes.push(`Bairro ${bairroTrim}`);
  const cidadeTrim = c.cidadeUf?.trim();
  if (cidadeTrim) enderecoPartes.push(cidadeTrim);
  if (cepFormatado) enderecoPartes.push(`CEP ${cepFormatado}`);
  const refTrim = c.referencia?.trim();
  if (refTrim) enderecoPartes.push(`ref.: ${refTrim}`);

  const enderecoBloco = enderecoPartes.join(', ');

  const profTrim = c.profissao?.trim();

  if (formato === 'contrato') {
    const partes: string[] = [
      c.nome.trim(),
      nac,
      estCivil,
    ];

    if (profTrim) {
      partes.push(`profissão ${profTrim}`);
    }

    partes.push(`${inscritoFlex} no CPF sob o n° ${cpfFormatado}`);
    partes.push(enderecoBloco);

    return partes.filter(Boolean).join(', ');
  }

  // formato === 'rotulos'
  const partesRotulos: string[] = [
    `Nacionalidade: ${nac}`,
    `Estado civil: ${estCivil}`,
  ];

  if (profTrim) {
    partesRotulos.push(`Profissão: ${profTrim}`);
  }

  partesRotulos.push(`CPF: ${cpfFormatado}`);
  partesRotulos.push(`Endereço: ${enderecoBloco}`);

  return partesRotulos.filter(Boolean).join(', ');
}

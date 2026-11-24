import { formatCpf } from './cpf';
import { formatCep } from './cep';
import { Genero, flexionar, estadoCivil, EstadoCivilValor } from './genero';

export type { Genero, EstadoCivilValor };

export interface ClienteRender {
  nome: string;
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

export function buildQualificacao(
  c: ClienteRender,
  formato: 'contrato' | 'rotulos'
): string {
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

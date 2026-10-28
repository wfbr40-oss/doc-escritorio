export class MarcadorDesconhecidoError extends Error {
  marcadores: string[];

  constructor(marcadores: string[]) {
    super(`Marcadores desconhecidos ou sem valor encontrados na moldura: ${marcadores.join(', ')}`);
    this.name = 'MarcadorDesconhecidoError';
    this.marcadores = marcadores;
  }
}

/**
 * Extrai todos os marcadores no formato {{CHAVE}} ou {{TIPO:chave}} do texto XML.
 */
export function extrairMarcadores(xmlContent: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const encontrados = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xmlContent)) !== null) {
    encontrados.add(match[1].trim());
  }

  return Array.from(encontrados);
}

export const MARCADORES_PADRAO = new Set([
  'CLIENTE_NOME',
  'CLIENTE_QUALIFICACAO',
  'CLIENTE_QUALIFICACAO_ROTULOS',
  'CLIENTE_CPF',
  'CLIENTE_CEP',
  'CLIENTE_ENDERECO',
  'CLIENTE_NUMERO',
  'CLIENTE_BAIRRO',
  'CLIENTE_CIDADE_UF',
  'CLIENTE_ESTADO_CIVIL',
  'CLIENTE_PROFISSAO',
  'CLIENTE_NACIONALIDADE',
  'ASSINATURA_LOCAL_DATA',
  'DATA_EXTENSO',
  'CIDADE_UF',
]);

/**
 * Valida se todos os marcadores encontrados no XML são conhecidos e possuem valor fornecido.
 */
export function validarMarcadores(
  marcadoresNoXml: string[],
  valores: Record<string, string>,
  clausulas: Record<string, string | string[]>
): void {
  const desconhecidos: string[] = [];

  for (const m of marcadoresNoXml) {
    if (MARCADORES_PADRAO.has(m)) {
      continue;
    }
    if (m.startsWith('VALOR:')) {
      const chave = m.slice(6);
      if (!(chave in valores) || valores[chave] === undefined || valores[chave] === null) {
        desconhecidos.push(m);
      }
    } else if (m.startsWith('CLAUSULA:')) {
      const chave = m.slice(9);
      if (!(chave in clausulas) || clausulas[chave] === undefined || clausulas[chave] === null) {
        desconhecidos.push(m);
      }
    } else {
      desconhecidos.push(m);
    }
  }

  if (desconhecidos.length > 0) {
    throw new MarcadorDesconhecidoError(desconhecidos);
  }
}

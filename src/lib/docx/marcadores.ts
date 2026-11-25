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

export interface MarcadorSistemaInfo {
  key: string;
  token: string;
  label: string;
  descricao: string;
  categoria: 'cliente' | 'qualificacao' | 'assinatura';
}

export const MARCADORES_PADRAO_INFO: MarcadorSistemaInfo[] = [
  {
    key: 'CLIENTE_NOME',
    token: '{{CLIENTE_NOME}}',
    label: 'Nome do Cliente',
    descricao: 'Nome completo preenchido no formulário.',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_QUALIFICACAO',
    token: '{{CLIENTE_QUALIFICACAO}}',
    label: 'Qualificação Jurídica Completa',
    descricao: 'Texto corrido com qualificação civil, CPF e endereço (editável por administradores).',
    categoria: 'qualificacao',
  },
  {
    key: 'CLIENTE_QUALIFICACAO_ROTULOS',
    token: '{{CLIENTE_QUALIFICACAO_ROTULOS}}',
    label: 'Qualificação em Rótulos',
    descricao: 'Qualificação no formato "Nacionalidade: ..., CPF: ..." (editável por administradores).',
    categoria: 'qualificacao',
  },
  {
    key: 'CLIENTE_CPF',
    token: '{{CLIENTE_CPF}}',
    label: 'CPF Formatado',
    descricao: 'CPF do cliente no formato 000.000.000-00.',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_ESTADO_CIVIL',
    token: '{{CLIENTE_ESTADO_CIVIL}}',
    label: 'Estado Civil Flexionado',
    descricao: 'Solteiro(a), casado(a), divorciado(a), viúvo(a) ou em união estável.',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_NACIONALIDADE',
    token: '{{CLIENTE_NACIONALIDADE}}',
    label: 'Nacionalidade Flexionada',
    descricao: 'Nacionalidade ajustada conforme o gênero selecionado.',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_PROFISSAO',
    token: '{{CLIENTE_PROFISSAO}}',
    label: 'Profissão',
    descricao: 'Profissão informada (ou vazio quando não preenchida).',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_ENDERECO',
    token: '{{CLIENTE_ENDERECO}}',
    label: 'Logradouro',
    descricao: 'Rua, avenida ou linha informada para o endereço.',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_NUMERO',
    token: '{{CLIENTE_NUMERO}}',
    label: 'Número do Endereço',
    descricao: 'Número residencial ou S/N.',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_BAIRRO',
    token: '{{CLIENTE_BAIRRO}}',
    label: 'Bairro',
    descricao: 'Bairro do endereço do cliente.',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_CIDADE_UF',
    token: '{{CLIENTE_CIDADE_UF}}',
    label: 'Cidade/UF',
    descricao: 'Município e sigla do estado (ex.: Macapá/AP).',
    categoria: 'cliente',
  },
  {
    key: 'CLIENTE_CEP',
    token: '{{CLIENTE_CEP}}',
    label: 'CEP Formatado',
    descricao: 'CEP do cliente no formato 00000-000.',
    categoria: 'cliente',
  },
  {
    key: 'ASSINATURA_LOCAL_DATA',
    token: '{{ASSINATURA_LOCAL_DATA}}',
    label: 'Local e Data da Assinatura',
    descricao: 'Combina Cidade/UF e data por extenso.',
    categoria: 'assinatura',
  },
  {
    key: 'DATA_EXTENSO',
    token: '{{DATA_EXTENSO}}',
    label: 'Data por Extenso',
    descricao: 'Data completa por extenso configurada na emissão.',
    categoria: 'assinatura',
  },
  {
    key: 'CIDADE_UF',
    token: '{{CIDADE_UF}}',
    label: 'Cidade/UF da Assinatura',
    descricao: 'Cidade/UF usada na linha de assinatura.',
    categoria: 'assinatura',
  },
];

export const MARCADORES_PADRAO = new Set(MARCADORES_PADRAO_INFO.map((m) => m.key));

/**
 * Valida se todos os marcadores encontrados no XML são conhecidos e possuem valor fornecido.
 */
export function validarMarcadores(
  marcadoresNoXml: string[],
  valores: Record<string, string>,
  clausulas: Record<string, string | string[]>,
  customMarkers: Record<string, string> = {}
): void {
  const desconhecidos: string[] = [];

  for (const m of marcadoresNoXml) {
    if (MARCADORES_PADRAO.has(m)) {
      continue;
    }
    if (m in customMarkers && customMarkers[m] !== undefined && customMarkers[m] !== null) {
      continue;
    }
    if (m.startsWith('VALOR:')) {
      const chave = m.slice(6);
      if (
        !(chave in valores) ||
        valores[chave] === undefined ||
        valores[chave] === null ||
        String(valores[chave]).trim() === ''
      ) {
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

import JSZip from 'jszip';
import { ClienteRender, buildQualificacao } from '../cliente/qualificacao';
import { formatCpf } from '../cliente/cpf';
import { formatCep } from '../cliente/cep';
import { estadoCivil } from '../cliente/genero';
import {
  extrairMarcadores,
  validarMarcadores,
  MarcadorDesconhecidoError,
} from './marcadores';

export { MarcadorDesconhecidoError };

export interface RenderData {
  cliente: ClienteRender;
  valores: Record<string, string>;
  clausulas: Record<string, string[]>;
  assinatura: {
    cidadeUf: string;
    dataExtenso: string;
  };
}

export function escapeXml(unsafe: string): string {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Normaliza XML do Word para reunir marcadores que foram divididos entre tags <w:r><w:t>
 */
export function desfragmentarMarcadoresXml(xml: string): string {
  let cleaned = xml;
  // Expressão que busca { dentro de uma tag <w:t> e fecha } em tag subsequente
  const splitPattern = /(\{[^{}<>]*)(<\/w:t>(?:<\/w:r>)?(?:<w:proofErr[^>]*\/>)?(?:<w:r[^>]*>)?<w:t[^>]*>)([^{}<>]*\})/g;
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(splitPattern, '$1$3');
  }
  return cleaned;
}

/**
 * Renderiza um documento DOCX substituindo os marcadores pelos valores validados.
 */
export async function renderDocx(
  moldura: Uint8Array,
  data: RenderData
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(moldura);
  const docXmlFile = zip.file('word/document.xml');

  if (!docXmlFile) {
    throw new Error('Arquivo DOCX inválido: word/document.xml não encontrado.');
  }

  let xml = await docXmlFile.async('string');
  xml = desfragmentarMarcadoresXml(xml);

  // 1. Extração e Validação dos Marcadores
  const marcadoresEncontrados = extrairMarcadores(xml);
  validarMarcadores(marcadoresEncontrados, data.valores, data.clausulas);

  // 2. Mapeamento dos valores conhecidos
  const mapaValores: Record<string, string> = {
    CLIENTE_NOME: data.cliente.nome,
    CLIENTE_QUALIFICACAO: buildQualificacao(data.cliente, 'contrato'),
    CLIENTE_QUALIFICACAO_ROTULOS: buildQualificacao(data.cliente, 'rotulos'),
    CLIENTE_CPF: formatCpf(data.cliente.cpf),
    CLIENTE_CEP: formatCep(data.cliente.cep),
    CLIENTE_ENDERECO: data.cliente.endereco,
    CLIENTE_NUMERO: data.cliente.numero,
    CLIENTE_BAIRRO: data.cliente.bairro,
    CLIENTE_CIDADE_UF: data.cliente.cidadeUf,
    CLIENTE_ESTADO_CIVIL: estadoCivil(data.cliente.estadoCivil, data.cliente.genero),
    CLIENTE_PROFISSAO: data.cliente.profissao || '',
    CLIENTE_NACIONALIDADE: data.cliente.nacionalidade || 'brasileiro',
    ASSINATURA_LOCAL_DATA: `${data.assinatura.cidadeUf}, ${data.assinatura.dataExtenso}`,
    DATA_EXTENSO: data.assinatura.dataExtenso,
    CIDADE_UF: data.assinatura.cidadeUf,
  };

  // 3. Substituição de Cláusulas (podem ser múltiplos parágrafos)
  for (const [chave, paragrafos] of Object.entries(data.clausulas)) {
    const placeholder = `{{CLAUSULA:${chave}}}`;
    if (!xml.includes(placeholder)) continue;

    // Se o marcador estiver dentro de um parágrafo Word <w:p>...</w:p>
    const pRegex = new RegExp(`(<w:p(?: [^>]*)?>[\\s\\S]*?${escapeRegex(placeholder)}[\\s\\S]*?<\\/w:p>)`, 'g');

    xml = xml.replace(pRegex, (fullParagraph) => {
      if (!Array.isArray(paragrafos) || paragrafos.length === 0) {
        return fullParagraph.replace(placeholder, '');
      }

      // Se for apenas 1 parágrafo
      if (paragrafos.length === 1) {
        return fullParagraph.replace(placeholder, escapeXml(paragrafos[0]));
      }

      // Múltiplos parágrafos: replica o template do parágrafo original
      return paragrafos
        .map((pText) => fullParagraph.replace(placeholder, escapeXml(pText)))
        .join('');
    });

    // Caso de fallback se não estiver dentro de tag <w:p> convencional
    if (xml.includes(placeholder)) {
      const pJoined = (Array.isArray(paragrafos) ? paragrafos : [paragrafos])
        .map((t) => escapeXml(t))
        .join('</w:t></w:r><w:r><w:br/><w:t>');
      xml = xml.replaceAll(placeholder, pJoined);
    }
  }

  // 4. Substituição de Valores {{VALOR:chave}}
  for (const [chave, valor] of Object.entries(data.valores)) {
    const placeholder = `{{VALOR:${chave}}}`;
    xml = xml.replaceAll(placeholder, escapeXml(valor));
  }

  // 5. Substituição dos Marcadores Padrão
  for (const [chave, valor] of Object.entries(mapaValores)) {
    const placeholder = `{{${chave}}}`;
    xml = xml.replaceAll(placeholder, escapeXml(valor));
  }

  // 6. Verificações de integridade estrita
  if (xml.includes('{{') || xml.includes('}}')) {
    const remanescentes = extrairMarcadores(xml);
    if (remanescentes.length > 0) {
      throw new MarcadorDesconhecidoError(remanescentes);
    }
  }

  if (xml.includes('>undefined<') || xml.includes('>null<')) {
    throw new Error('Erro de renderização: texto undefined ou null gerado no documento.');
  }

  // Atualiza word/document.xml no ZIP
  zip.file('word/document.xml', xml);

  // Também verifica headers e footers se existirem
  const otherFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith('word/header') || name.startsWith('word/footer')
  );

  for (const fileName of otherFiles) {
    const file = zip.file(fileName);
    if (!file) continue;
    let hXml = await file.async('string');
    hXml = desfragmentarMarcadoresXml(hXml);
    for (const [k, v] of Object.entries(mapaValores)) {
      hXml = hXml.replaceAll(`{{${k}}}`, escapeXml(v));
    }
    zip.file(fileName, hXml);
  }

  const generatedBlob = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });

  return generatedBlob;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

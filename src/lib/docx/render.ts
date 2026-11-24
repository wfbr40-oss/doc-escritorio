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
 * Encontra os limites [start, end) do elemento <w:p>...</w:p> mais interno que contém `index`.
 */
function findEnclosingParagraphBounds(
  xml: string,
  index: number
): { start: number; end: number } | null {
  const openTagRegex = /<w:p(?=>|\s)/g;
  let lastOpen = -1;
  let match: RegExpExecArray | null;

  while ((match = openTagRegex.exec(xml)) !== null) {
    if (match.index > index) break;
    // Garante que não houve fechamento entre esse <w:p e `index` ou que este é o mais próximo
    lastOpen = match.index;
  }

  if (lastOpen === -1) return null;

  const closeTag = '</w:p>';
  const closeIdx = xml.indexOf(closeTag, index);
  if (closeIdx === -1) return null;

  // Confirma que não existe outro </w:p> entre lastOpen e index (caso fosse um parágrafo irmão anterior)
  const intermediateClose = xml.lastIndexOf(closeTag, index);
  if (intermediateClose > lastOpen) {
    // Significa que o lastOpen encontrado pertencia a uma abertura externa e fechou antes de index;
    // ainda assim, não deve acontecer se lastOpen for o <w:p mais próximo antes de index.
    // Se aconteceu, não há parágrafo envolvendo `index`.
    return null;
  }

  return { start: lastOpen, end: closeIdx + closeTag.length };
}

/**
 * Reúne marcadores {{...}} fragmentados em múltiplos <w:r><w:t> dentro de um parágrafo,
 * preservando integralmente <w:rPr> e demais tags do Word.
 */
function desfragmentarParagrafo(pXml: string): string {
  if (!pXml.includes('{')) return pXml;

  let current = pXml;
  let guard = 0;

  while (guard < 50) {
    guard++;
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    const nodes: Array<{
      fullStart: number;
      fullEnd: number;
      openTag: string;
      text: string;
      cumStart: number;
      cumEnd: number;
    }> = [];

    let fullText = '';
    let m: RegExpExecArray | null;
    while ((m = tRegex.exec(current)) !== null) {
      const openEnd = m[0].indexOf('>') + 1;
      const openTag = m[0].slice(0, openEnd);
      const text = m[1];
      const cumStart = fullText.length;
      fullText += text;
      nodes.push({
        fullStart: m.index,
        fullEnd: m.index + m[0].length,
        openTag,
        text,
        cumStart,
        cumEnd: fullText.length,
      });
    }

    if (nodes.length <= 1) break;

    // Procura o primeiro marcador {{...}} em fullText que atravesse mais de um nó <w:t>
    const markerRegex = /\{\{[^}]+\}\}/g;
    let markerMatch: RegExpExecArray | null;
    let fixedInPass = false;

    while ((markerMatch = markerRegex.exec(fullText)) !== null) {
      const mStart = markerMatch.index;
      const mEnd = mStart + markerMatch[0].length;

      const startNodeIdx = nodes.findIndex((n) => mStart >= n.cumStart && mStart < n.cumEnd);
      const endNodeIdx = nodes.findIndex((n) => mEnd - 1 >= n.cumStart && mEnd - 1 < n.cumEnd);

      if (startNodeIdx !== -1 && endNodeIdx !== -1 && startNodeIdx !== endNodeIdx) {
        const startNode = nodes[startNodeIdx];
        const endNode = nodes[endNodeIdx];

        const prefixInStart = startNode.text.slice(0, mStart - startNode.cumStart);
        const suffixInEnd = endNode.text.slice(mEnd - endNode.cumStart);

        const newStartOpenTag = startNode.openTag.includes('xml:space')
          ? startNode.openTag
          : startNode.openTag.replace('<w:t', '<w:t xml:space="preserve"');

        // Reconstrói o parágrafo mantendo todas as tags intermediárias intactas
        let rebuilt = '';
        let cursor = 0;

        for (let i = startNodeIdx; i <= endNodeIdx; i++) {
          const n = nodes[i];
          rebuilt += current.slice(cursor, n.fullStart);
          if (i === startNodeIdx) {
            rebuilt += `${newStartOpenTag}${prefixInStart}${markerMatch[0]}</w:t>`;
          } else if (i === endNodeIdx) {
            const newEndOpenTag = endNode.openTag.includes('xml:space')
              ? endNode.openTag
              : endNode.openTag.replace('<w:t', '<w:t xml:space="preserve"');
            rebuilt += `${newEndOpenTag}${suffixInEnd}</w:t>`;
          } else {
            rebuilt += `${n.openTag}</w:t>`;
          }
          cursor = n.fullEnd;
        }
        rebuilt += current.slice(cursor);
        current = rebuilt;
        fixedInPass = true;
        break;
      }
    }

    if (!fixedInPass) break;
  }

  return current;
}

/**
 * Normaliza XML do Word para reunir marcadores que foram divididos entre tags <w:r><w:t>
 */
export function desfragmentarMarcadoresXml(xml: string): string {
  if (!xml.includes('{')) return xml;

  // Percorre os parágrafos mais internos que contêm '{'
  const pCloseRegex = /<\/w:p>/g;
  const pOpenRegex = /<w:p(?=>|\s)/g;

  // Para evitar problemas com nested <w:p> (ex: textboxes), processamos de forma segura usando uma pilha de aberturas
  const tokens: Array<{ type: 'open' | 'close'; index: number; len: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = pOpenRegex.exec(xml)) !== null) {
    tokens.push({ type: 'open', index: m.index, len: m[0].length });
  }
  while ((m = pCloseRegex.exec(xml)) !== null) {
    tokens.push({ type: 'close', index: m.index, len: m[0].length });
  }
  tokens.sort((a, b) => a.index - b.index);

  // Encontra apenas parágrafos folha (innermost) que contêm '{'
  const stack: number[] = [];
  const leafRanges: Array<{ start: number; end: number }> = [];
  let hasChildPStack: boolean[] = [];

  for (const tok of tokens) {
    if (tok.type === 'open') {
      if (hasChildPStack.length > 0) {
        hasChildPStack[hasChildPStack.length - 1] = true;
      }
      stack.push(tok.index);
      hasChildPStack.push(false);
    } else {
      const start = stack.pop();
      const hadChild = hasChildPStack.pop();
      if (start !== undefined && !hadChild) {
        const slice = xml.slice(start, tok.index + tok.len);
        if (slice.includes('{')) {
          leafRanges.push({ start, end: tok.index + tok.len });
        }
      }
    }
  }

  if (leafRanges.length === 0) return xml;

  let result = '';
  let cursor = 0;
  for (const r of leafRanges) {
    result += xml.slice(cursor, r.start);
    result += desfragmentarParagrafo(xml.slice(r.start, r.end));
    cursor = r.end;
  }
  result += xml.slice(cursor);
  return result;
}

/**
 * Converte texto com marcação opcional de negrito (**texto**) em runs OpenXML <w:r>,
 * preservando o <w:rPr> base do parágrafo original.
 */
function buildClauseRunsXml(text: string, baseRPr: string): string {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  if (parts.length === 0) {
    return `<w:r>${baseRPr}<w:t xml:space="preserve"></w:t></w:r>`;
  }

  return parts
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const inner = part.slice(2, -2);
        let boldRPr = baseRPr;
        if (!boldRPr) {
          boldRPr = '<w:rPr><w:b/><w:bCs/></w:rPr>';
        } else if (!boldRPr.includes('<w:b')) {
          boldRPr = boldRPr.replace('<w:rPr>', '<w:rPr><w:b/><w:bCs/>');
        }
        return `<w:r>${boldRPr}<w:t xml:space="preserve">${escapeXml(inner)}</w:t></w:r>`;
      }
      return `<w:r>${baseRPr}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`;
    })
    .join('');
}

/**
 * Substitui um parágrafo que contém {{CLAUSULA:chave}} por N parágrafos formatados,
 * preservando <w:pPr> e <w:rPr> da moldura original e aceitando trechos em negrito (**...**).
 */
function replaceClauseInXml(
  xml: string,
  placeholder: string,
  paragrafos: string[]
): string {
  let result = xml;
  let searchFrom = 0;

  while (true) {
    const idx = result.indexOf(placeholder, searchFrom);
    if (idx === -1) break;

    const bounds = findEnclosingParagraphBounds(result, idx);
    if (!bounds) {
      // Fallback caso não esteja em um <w:p> convencional
      const pJoined = (Array.isArray(paragrafos) ? paragrafos : [paragrafos])
        .map((t) => escapeXml(t.replace(/\*\*/g, '')))
        .join('</w:t></w:r><w:r><w:br/><w:t xml:space="preserve">');
      result =
        result.slice(0, idx) +
        pJoined +
        result.slice(idx + placeholder.length);
      searchFrom = idx + pJoined.length;
      continue;
    }

    const fullParagraph = result.slice(bounds.start, bounds.end);
    const pOpenMatch = fullParagraph.match(/^<w:p(?:\s[^>]*)?>/);
    const pOpenTag = pOpenMatch ? pOpenMatch[0] : '<w:p>';
    const pPrMatch = fullParagraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';

    // Extrai o <w:rPr> do run que contém o marcador (ou o primeiro <w:rPr> do parágrafo)
    const runWithPlaceholderRegex = new RegExp(
      `<w:r(?:\\s[^>]*)?>([\\s\\S]*?)${escapeRegex(placeholder)}[\\s\\S]*?<\\/w:r>`
    );
    const runMatch = fullParagraph.match(runWithPlaceholderRegex);
    let baseRPr = '';
    if (runMatch) {
      const rPrInRun = runMatch[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
      if (rPrInRun) baseRPr = rPrInRun[0];
    } else {
      const firstRPr = fullParagraph.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
      if (firstRPr) baseRPr = firstRPr[0];
    }

    let replacementParagraphsXml = '';
    if (!Array.isArray(paragrafos) || paragrafos.length === 0) {
      replacementParagraphsXml = fullParagraph.replace(placeholder, '');
    } else if (paragrafos.length === 1 && !paragrafos[0].includes('**')) {
      replacementParagraphsXml = fullParagraph.replace(
        placeholder,
        escapeXml(paragrafos[0])
      );
    } else {
      replacementParagraphsXml = paragrafos
        .map((pText) => {
          const runsXml = buildClauseRunsXml(pText, baseRPr);
          return `${pOpenTag}${pPr}${runsXml}</w:p>`;
        })
        .join('');
    }

    result =
      result.slice(0, bounds.start) +
      replacementParagraphsXml +
      result.slice(bounds.end);
    searchFrom = bounds.start + replacementParagraphsXml.length;
  }

  return result;
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

  const headerFooterFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith('word/header') || name.startsWith('word/footer')
  );

  const xmlParts: Map<string, string> = new Map();
  let mainXml = await docXmlFile.async('string');
  mainXml = desfragmentarMarcadoresXml(mainXml);
  xmlParts.set('word/document.xml', mainXml);

  for (const fileName of headerFooterFiles) {
    const file = zip.file(fileName);
    if (!file) continue;
    let hXml = await file.async('string');
    hXml = desfragmentarMarcadoresXml(hXml);
    xmlParts.set(fileName, hXml);
  }

  // 1. Extração e Validação Prévia de TODOS os marcadores (moldura, headers/footers e cláusulas dinâmicas)
  const marcadoresSet = new Set<string>();
  for (const xmlContent of xmlParts.values()) {
    for (const m of extrairMarcadores(xmlContent)) {
      marcadoresSet.add(m);
    }
  }
  for (const paragrafos of Object.values(data.clausulas || {})) {
    for (const p of paragrafos) {
      for (const m of extrairMarcadores(p)) {
        marcadoresSet.add(m);
      }
    }
  }

  validarMarcadores(Array.from(marcadoresSet), data.valores, data.clausulas);

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

  // 3. Aplica substituições em todas as partes XML
  for (const [partName, originalXml] of xmlParts.entries()) {
    let xml = originalXml;

    // 3a. Substituição de Cláusulas (múltiplos parágrafos + suporte a negrito **)
    for (const [chave, paragrafos] of Object.entries(data.clausulas || {})) {
      const placeholder = `{{CLAUSULA:${chave}}}`;
      if (xml.includes(placeholder)) {
        xml = replaceClauseInXml(xml, placeholder, paragrafos);
      }
    }

    // 3b. Substituição de Valores {{VALOR:chave}}
    for (const [chave, valor] of Object.entries(data.valores || {})) {
      const placeholder = `{{VALOR:${chave}}}`;
      xml = xml.replaceAll(placeholder, escapeXml(valor));
    }

    // 3c. Substituição dos Marcadores Padrão
    for (const [chave, valor] of Object.entries(mapaValores)) {
      const placeholder = `{{${chave}}}`;
      xml = xml.replaceAll(placeholder, escapeXml(valor));
    }

    // 3d. Verificações de integridade estrita
    if (xml.includes('{{') || xml.includes('}}')) {
      const remanescentes = extrairMarcadores(xml);
      if (remanescentes.length > 0) {
        throw new MarcadorDesconhecidoError(remanescentes);
      }
      throw new MarcadorDesconhecidoError(['marcador_malformado']);
    }

    if (xml.includes('>undefined<') || xml.includes('>null<')) {
      throw new Error('Erro de renderização: texto undefined ou null gerado no documento.');
    }

    zip.file(partName, xml);
  }

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

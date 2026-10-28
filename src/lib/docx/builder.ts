import JSZip from 'jszip';
import { escapeXml } from './render';

/**
 * Cria uma estrutura de arquivo DOCX válida (OpenXML padrão Microsoft Word)
 * com título, parágrafos formatados e marcadores para uso como moldura.
 */
export async function createTemplateDocx(
  titulo: string,
  paragrafos: string[],
  opcoes?: { subtitulo?: string; rodape?: string }
): Promise<Uint8Array> {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="pt-BR"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto" w:after="160"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`
  );

  // word/document.xml
  const pElements: string[] = [];

  // Título centralizado e em negrito
  pElements.push(`
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="280"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>${escapeXml(titulo)}</w:t>
      </w:r>
    </w:p>
  `);

  if (opcoes?.subtitulo) {
    pElements.push(`
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:after="240"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:i/>
            <w:sz w:val="22"/>
          </w:rPr>
          <w:t>${escapeXml(opcoes.subtitulo)}</w:t>
        </w:r>
      </w:p>
    `);
  }

  // Parágrafos do corpo
  for (const p of paragrafos) {
    pElements.push(`
      <w:p>
        <w:pPr>
          <w:jc w:val="both"/>
          <w:spacing w:after="160" w:line="360" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:t xml:space="preserve">${escapeXml(p)}</w:t>
        </w:r>
      </w:p>
    `);
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${pElements.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });
}

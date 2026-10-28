# Decisões de Arquitetura e Engenharia (ADRs)

## 01. Biblioteca e Motor de Renderização de DOCX

- **Data:** 27 de Outubro de 2026
- **Contexto:** A especificação exige que o gerador de documentos previdenciários produza arquivos `.docx` perfeitamente compatíveis com Microsoft Word e LibreOffice, sem mensagens de corrupção de arquivo, sem quebra de formatação (margens, fontes, parágrafos), com suporte estrito a caracteres especiais (`<`, `>`, `&`, `"`, `'`) e sem deixar marcadores não substituídos ou tokens espúrios (`undefined`, `null`).
- **Decisão:** Optou-se pela arquitetura baseada em `JSZip` com parser e serializador OpenXML (`[Content_Types].xml`, `word/document.xml`, `word/styles.xml`).
- **Justificativa:**
  1. **Fidelidade Total:** Ao manipular diretamente o pacote OpenXML conforme as normas ISO/IEC 29500-1, o layout original preparado pelo advogado (margens, fontes, cabeçalhos, rodapés) é preservado integralmente.
  2. **Imunidade a Corrupção:** A serialização realiza escape estrito de entidades XML (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`), impedindo que nomes como `D'Ávila & Filhos <Ltda> "Teste"` quebrem o parser do Word.
  3. **Desfragmentação de Runs:** Resolve o problema crônico do Word de quebrar marcadores como `{{CLIENTE_NOME}}` em múltiplos elementos `<w:r><w:t>`, garantindo substituição determinística.
  4. **Multi-Parágrafo em Cláusulas:** Cláusulas dinâmicas com múltiplos parágrafos (`string[]`) replicam a estrutura de estilo do parágrafo original sem introduzir quebras lineares inválidas.
  5. **Validação Estrita:** Lança `MarcadorDesconhecidoError` caso algum marcador não conste nos dados fornecidos, evitando documentos entregues com `{{...}}` visível ao cliente.

## 02. Retenção de 1 Ano e Vercel Cron

- **Decisão:** Utilização de Vercel Cron diário chamando a rota `/api/cron/retencao`, protegida com token Bearer `CRON_SECRET`.
- **Comportamento:** Remove arquivos físicos do storage e zera o campo `snapshot` de registros com `expires_at < now()`, marcando o status como `'expirado'`.

# Decisões de Arquitetura e Engenharia (ADRs)

## 01. Biblioteca e Motor de Renderização de DOCX (Teste de Fidelidade — Tarefa 4)

- **Data:** 24 de Novembro de 2026
- **Contexto:** A especificação exige que o gerador de documentos previdenciários produza arquivos `.docx` perfeitamente compatíveis com Microsoft Word e LibreOffice, cumprindo integralmente três critérios de fidelidade:
  - **(a)** Abrir no Word sem nenhum aviso de arquivo corrompido ou recuperação;
  - **(b)** Manter fonte, margens, tabelas/caixas, cabeçalhos e rodapés idênticos à moldura original preparada pelo advogado;
  - **(c)** Aceitar múltiplos parágrafos e trechos em negrito dentro de `{{CLAUSULA:…}}`, além de escapar caracteres especiais (`<`, `>`, `&`, `"`, `'`) e impedir qualquer token `{{…}}`, `undefined` ou `null` residual.
- **Alternativas avaliadas:**
  1. `docx` (geração programática do zero): rejeitada para molduras pré-existentes porque exige recriar manualmente todo o layout da procuração/contrato no código, correndo risco constante de divergir de margens, caixas e tipografia da moldura aprovada pelo advogado.
  2. `docxtemplater` (com `pizzip`): manipula o pacote OpenXML da moldura original, porém na versão gratuita não possui suporte nativo a múltiplos parágrafos com formatação mista (negrito inline) dentro de um único marcador sem plugins pagos ou XML raw manual.
  3. **Motor OpenXML direto sobre `JSZip` (`src/lib/docx/render.ts`) — ESCOLHIDA:** preserva 100% do pacote ZIP/OpenXML da moldura original (`[Content_Types].xml`, `word/styles.xml`, `word/header*.xml`, `word/footer*.xml`, `w:pgMar`, `w:tbl`, `w:txbxContent`), implementa desfragmentação determinística de runs divididos pelo Word (`<w:r><w:t>` + `<w:proofErr/>`), substitui cláusulas multi-parágrafo replicando `<w:pPr>` e `<w:rPr>` originais com suporte a trechos em negrito (`**...**`), e valida todos os marcadores antes da renderização lançando `MarcadorDesconhecidoError`.
- **Justificativa:**
  1. **Fidelidade Total:** Preserva integralmente margens, fontes, bordas de tabelas/caixas, cabeçalhos e rodapés da moldura original.
  2. **Imunidade a Corrupção:** Escape estrito de entidades XML (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`), garantindo que nomes como `D'Ávila & Filhos <Ltda> "Teste"` abram no Word sem erros.
  3. **Desfragmentação de Runs:** Reúne marcadores quebrados pelo corretor ortográfico ou histórico de edição do Word em múltiplos `<w:r><w:t>`.
  4. **Cláusulas Multi-Parágrafo e Negrito:** Replica o parágrafo-molde mantendo espaçamento e fonte, convertendo `**texto**` em runs `<w:b/>` válidos sem duplicar parágrafos anteriores.
  5. **Validação Estrita:** Lança `MarcadorDesconhecidoError` listando todos os marcadores sem valor ou desconhecidos antes de entregar o arquivo.

## 02. Retenção de 1 Ano e Vercel Cron

- **Decisão:** Utilização de Vercel Cron diário chamando a rota `/api/cron/retencao`, protegida com token Bearer `CRON_SECRET`.
- **Comportamento:** Remove arquivos físicos do storage e zera o campo `snapshot` de registros com `expires_at < now()`, marcando o status como `'expirado'`.

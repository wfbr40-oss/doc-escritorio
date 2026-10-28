# Checklist de Aceite — Kit Previdenciário (Fase 1)

> **Documento de Homologação e Conformidade Técnica**  
> Data de Aprovação: 27 de Outubro de 2026  
> Responsável Técnico: Engenharia de Software  
> Advogada Responsável: Dra. Amanda Oliveira (OAB)

Todos os itens deste checklist devem estar validados antes do uso do sistema em produção com clientes reais.

---

## 1. Regras de Negócio e Dados do Cliente

- [x] **Gênero Gramatical Feminino:** Cliente com gênero `F` gera qualificação contendo `inscrita no CPF sob o n°`, `domiciliada em` e `brasileira` (ou nacionalidade flexionada).
- [x] **Gênero Gramatical Masculino:** Cliente com gênero `M` gera qualificação contendo `inscrito no CPF sob o n°`, `domiciliado em` e `brasileiro`.
- [x] **Sem Artigo antes do Logradouro:** Endereço montado estritamente com `em [Logradouro]` (ex.: `residente e domiciliada em Rua das Flores`), sem introduzir artigos como `na Rua` ou `no Logradouro`.
- [x] **Cliente sem Profissão:** Quando o campo de profissão for deixado em branco, a qualificação não inclui a palavra `profissão`, nem gera vírgulas consecutivas (`, ,` ou `,,`).
- [x] **Validação e Normalização de CPF:** Rejeita CPFs matematicamente inválidos (status 422) ou números repetidos (`111.111.111-11`). Formata adequadamente com pontos e hífen (`000.000.000-00`).
- [x] **Formatação de CEP:** Normaliza entradas com espaços, pontos ou traços para o formato padrão `00000-000`.
- [x] **Data por Extenso e Fuso de Brasília:** Datas geradas no fuso horário `America/Sao_Paulo`, inclusive para requisições próximas da meia-noite UTC.

---

## 2. Fidelidade do Motor DOCX e Integridade OpenXML

- [x] **Escape de Entidades XML:** Caracteres especiais como `&`, `<`, `>`, `"`, `'` (ex.: `D'Ávila & Filhos <Ltda> "Teste"`) são devidamente serializados como entidades XML seguras e abrem no Microsoft Word sem aviso de arquivo corrompido.
- [x] **Nomes Extensos:** Nomes com mais de 80 a 90 caracteres não quebram o cabeçalho nem corrompem a estrutura do arquivo.
- [x] **Detecção de Marcadores Desconhecidos:** A presença de marcador sem valor associado na moldura (ex.: `{{VALOR:inexistente}}`) interrompe o processo e lança `MarcadorDesconhecidoError` com a lista exata dos marcadores ausentes.
- [x] **Isenção de Tokens Espúrios:** Nenhum arquivo DOCX gerado contém resquícios de marcadores `{{...}}`, nem as literais `undefined` ou `null`.
- [x] **Cláusulas Multi-Parágrafo:** A substituição de `{{CLAUSULA:honorarios}}` contendo múltiplos parágrafos preserva a estrutura de tags `<w:p>` do OpenXML.

---

## 3. Modelos do Kit Previdenciário e Variantes

- [x] **Composição Oficial do Kit (8 Documentos):**
  1. *Procuração Ad Judicia et Extra* (Template)
  2. *Contrato de Honorários Advocatícios Previdenciários* (Template com variantes)
  3. *Declaração de Hipossuficiência Econômica* (Template)
  4. *Termo de Renúncia aos Excedentes a 60 SM no JEF* (Template)
  5. *Requerimento Administrativo de Benefício no INSS* (Template)
  6. *Termo de Ciência e Notificação de Tramitação* (Template)
  7. *Declaração de Residência e Domicílio* (Template)
  8. *Cadastro de Cliente* (Estático — em branco, sem preenchimento)
- [x] **Variantes Contratuais Homologadas:**
  - Variante `padrao`: 30% sobre proveito econômico com pisos mínimos de R$ 14.000,00 (geral), R$ 8.000,00 (auxílio-acidente) e R$ 6.000,00 (período rural/especial).
  - Variante `auxilio_acidente_trafego_pago`: 30% sobre parcelas vencidas e 12 vincendas, com piso de R$ 5.000,00.
- [x] **Isolamento de Ajustes Pontuais:** Ajustes finos realizados para um cliente específico alteram apenas o `RenderData` daquele atendimento, sem mutar as tabelas de `clause_variants`.

---

## 4. Segurança, RLS e Proteção de Dados (LGPD)

- [x] **Cadastro Público Desativado:** Tentativas de autocadastro na API pública do Supabase são sumariamente rejeitadas com erro 403 (`SIGNUP_DESATIVADO`).
- [x] **Mensagens Genéricas de Login:** Em caso de credenciais inválidas, a mensagem exibida não revela se o e-mail existe ou não.
- [x] **Proteção de Variáveis Secretas:** A chave `SUPABASE_SERVICE_ROLE_KEY` e o `CRON_SECRET` são restritos ao servidor e nunca expostos ao cliente.
- [x] **Imunidade a Sobrescrita por Concorrência:** Duas gerações simultâneas produzem `batchId` e nomes de arquivos UUID distintos, nomeados exclusivamente pelo ID do registro e nunca pelo nome do cliente.
- [x] **Download Seguro via Streaming:** Downloads exigem sessão ativa e entregam o arquivo binário previamente gerado sem reprocessamento.
- [x] **Trilha de Auditoria Sem PII:** Eventos de geração e download são registrados no `audit_log` contendo apenas identificadores técnicos (IDs, timestamp, usuário), sem qualquer dado pessoal (CPF, nome completo, endereço).
- [x] **Política de Retenção de 1 Ano:**
  - Documentos recebem validade de 365 dias a partir da emissão (`expires_at`).
  - Rota diária `/api/cron/retencao` protegida por `CRON_SECRET` apaga arquivos do storage e zera os snapshots dos registros vencidos.
  - Alerta visual destacado no painel para documentos que atingirão o prazo nos próximos 30 dias.
  - Documento expirado retorna HTTP 410 ao tentar ser baixado.

---

## 5. Assinatura de Homologação

- **Advogada Responsável:** ______________________________________  
- **Data da Homologação:** 27 de Outubro de 2026

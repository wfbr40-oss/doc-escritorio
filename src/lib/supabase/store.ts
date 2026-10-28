/**
 * Store de dados com persistência em memória e sincronização com Supabase.
 * Fornece integridade referencial, controle de RLS e armazenamento privado para
 * kits, documentos, cláusulas, variantes, parâmetros, audit log e documentos gerados.
 */

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Kit {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  kit_id: string;
  name: string;
  kind: 'template' | 'static';
  template_file_path: string;
  order_index: number;
  created_at: string;
}

export interface Clause {
  id: string;
  document_id: string;
  name: string;
  key: string;
  created_at: string;
}

export interface ClauseVariant {
  id: string;
  clause_id: string;
  key: string;
  name: string;
  text_paragraphs: string[];
  is_default: boolean;
  created_at: string;
}

export interface Parameter {
  id: string;
  document_id: string;
  key: string;
  label: string;
  default_value: string;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  batch_id: string;
  document_id: string;
  document_name: string;
  user_id: string;
  user_name: string;
  client_masked_name: string;
  file_path: string;
  status: 'ativo' | 'expirado';
  snapshot: Record<string, unknown> | null;
  file_bytes?: Uint8Array;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  target_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// 3 Usuários Iniciais do Escritório
export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-amanda-admin',
    name: 'Dra. Amanda Oliveira',
    email: 'amanda@escritorio.adv.br',
    role: 'admin',
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'user-carlos-adv',
    name: 'Dr. Carlos Mendes',
    email: 'carlos@escritorio.adv.br',
    role: 'user',
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'user-bruna-assistente',
    name: 'Bruna Souza',
    email: 'bruna@escritorio.adv.br',
    role: 'user',
    created_at: '2026-10-27T10:00:00Z',
  },
];

// Kit Previdenciário Inicial
export const INITIAL_KITS: Kit[] = [
  {
    id: 'kit_previdenciario',
    name: 'Kit Previdenciário Completo (Ação Judicial & Administrativa)',
    description: 'Conjunto completo de 8 documentos essenciais para causas previdenciárias perante o INSS e Justiça Federal.',
    created_at: '2026-10-27T10:00:00Z',
  },
];

// 8 Documentos do Kit Previdenciário (7 templates + 1 estático)
export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_procuracao',
    kit_id: 'kit_previdenciario',
    name: 'Procuração Ad Judicia et Extra',
    kind: 'template',
    template_file_path: 'molduras/procuracao_ad_judicia.docx',
    order_index: 1,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'doc_contrato_honorarios',
    kit_id: 'kit_previdenciario',
    name: 'Contrato de Honorários Advocatícios Previdenciários',
    kind: 'template',
    template_file_path: 'molduras/contrato_honorarios.docx',
    order_index: 2,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'doc_hipossuficiencia',
    kit_id: 'kit_previdenciario',
    name: 'Declaração de Hipossuficiência Econômica',
    kind: 'template',
    template_file_path: 'molduras/declaracao_hipossuficiencia.docx',
    order_index: 3,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'doc_renuncia_jef',
    kit_id: 'kit_previdenciario',
    name: 'Termo de Renúncia aos Excedentes a 60 SM (JEF)',
    kind: 'template',
    template_file_path: 'molduras/termo_renuncia_jef.docx',
    order_index: 4,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'doc_requerimento_inss',
    kit_id: 'kit_previdenciario',
    name: 'Requerimento Administrativo de Benefício (INSS)',
    kind: 'template',
    template_file_path: 'molduras/requerimento_administrativo.docx',
    order_index: 5,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'doc_ciencia_tramitacao',
    kit_id: 'kit_previdenciario',
    name: 'Termo de Ciência e Notificação de Tramitação',
    kind: 'template',
    template_file_path: 'molduras/termo_ciencia_tramitacao.docx',
    order_index: 6,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'doc_declaracao_residencia',
    kit_id: 'kit_previdenciario',
    name: 'Declaração de Residência e Domicílio',
    kind: 'template',
    template_file_path: 'molduras/declaracao_residencia.docx',
    order_index: 7,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'doc_cadastro_estatico',
    kit_id: 'kit_previdenciario',
    name: 'Cadastro de Cliente (Ficha em Branco)',
    kind: 'static',
    template_file_path: 'molduras/cadastro_cliente_estatico.docx',
    order_index: 8,
    created_at: '2026-10-27T10:00:00Z',
  },
];

// Cláusulas dinâmicas do contrato
export const INITIAL_CLAUSES: Clause[] = [
  {
    id: 'clause_honorarios',
    document_id: 'doc_contrato_honorarios',
    name: 'Cláusula de Honorários',
    key: 'honorarios',
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'clause_desistencia',
    document_id: 'doc_contrato_honorarios',
    name: 'Cláusula de Desistência e Rescisão',
    key: 'desistencia',
    created_at: '2026-10-27T10:00:00Z',
  },
];

// Variantes do contrato: padrão e auxilio_acidente_trafego_pago
export const INITIAL_VARIANTS: ClauseVariant[] = [
  {
    id: 'variant_honorarios_padrao',
    clause_id: 'clause_honorarios',
    key: 'padrao',
    name: 'Padrão (30% + Mínimos)',
    text_paragraphs: [
      'CLÁUSULA QUINTA (DOS HONORÁRIOS): O CONTRATANTE pagará aos CONTRATADOS o percentual de 30% (trinta por cento) sobre o proveito econômico integral alcançado em sede administrativa ou judicial.',
      'PARÁGRAFO PRIMEIRO: Fica estipulado que, em qualquer hipótese de êxito na ação, os honorários não serão inferiores a R$ {{VALOR:minimo_honorarios}}, sendo o piso mínimo de R$ {{VALOR:minimo_auxilio_acidente}} na concessão de auxílio-acidente e de R$ {{VALOR:minimo_reconhecimento_periodo}} no caso de averbação/reconhecimento de tempo rural ou especial.',
    ],
    is_default: true,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'variant_honorarios_trafego',
    clause_id: 'clause_honorarios',
    key: 'auxilio_acidente_trafego_pago',
    name: 'Auxílio-Acidente Tráfego Pago',
    text_paragraphs: [
      'CLÁUSULA QUINTA (DOS HONORÁRIOS): O CONTRATANTE pagará aos CONTRATADOS o percentual de 30% (trinta por cento) sobre as parcelas vencidas e doze vincendas decorrentes da concessão do auxílio-acidente decorrente de tráfego.',
      'PARÁGRAFO ÚNICO: Fica expressamente ajustado o valor mínimo irrevogável de R$ {{VALOR:minimo_honorarios}} a título de honorários advocatícios em caso de procedência do pedido.',
    ],
    is_default: false,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'variant_desistencia_padrao',
    clause_id: 'clause_desistencia',
    key: 'padrao',
    name: 'Desistência Padrão',
    text_paragraphs: [
      'CLÁUSULA SEXTA (DA DESISTÊNCIA): Em caso de revogação imotivada do mandato ou desistência da ação por iniciativa exclusiva do CONTRATANTE antes da prolação da sentença ou acordo, incidirá a obrigação do pagamento integral dos honorários mínimos convencionados neste instrumento.',
    ],
    is_default: true,
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'variant_desistencia_trafego',
    clause_id: 'clause_desistencia',
    key: 'auxilio_acidente_trafego_pago',
    name: 'Desistência Tráfego Pago',
    text_paragraphs: [
      'CLÁUSULA SEXTA (DA DESISTÊNCIA): Na ocorrência de acordo extrajudicial direto sem a ciência dos patronos ou desistência injustificada da causa pelo CONTRATANTE, será exigível a título de cláusula penal compensatória o montante de 50% (cinquenta por cento) do piso de honorários pactuado.',
    ],
    is_default: false,
    created_at: '2026-10-27T10:00:00Z',
  },
];

// Parâmetros do contrato com valores oficiais
export const INITIAL_PARAMETERS: Parameter[] = [
  {
    id: 'param_minimo_honorarios',
    document_id: 'doc_contrato_honorarios',
    key: 'minimo_honorarios',
    label: 'Mínimo de Honorários (R$)',
    default_value: '14.000,00',
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'param_minimo_auxilio_acidente',
    document_id: 'doc_contrato_honorarios',
    key: 'minimo_auxilio_acidente',
    label: 'Mínimo Auxílio-Acidente (R$)',
    default_value: '8.000,00',
    created_at: '2026-10-27T10:00:00Z',
  },
  {
    id: 'param_minimo_reconhecimento_periodo',
    document_id: 'doc_contrato_honorarios',
    key: 'minimo_reconhecimento_periodo',
    label: 'Mínimo Reconhecimento de Período (R$)',
    default_value: '6.000,00',
    created_at: '2026-10-27T10:00:00Z',
  },
];

/**
 * Storage central para estado compartilhado
 */
class MemoryDataStore {
  profiles = new Map<string, Profile>(INITIAL_PROFILES.map((p) => [p.id, p]));
  kits = new Map<string, Kit>(INITIAL_KITS.map((k) => [k.id, k]));
  documents = new Map<string, DocumentItem>(INITIAL_DOCUMENTS.map((d) => [d.id, d]));
  clauses = new Map<string, Clause>(INITIAL_CLAUSES.map((c) => [c.id, c]));
  variants = new Map<string, ClauseVariant>(INITIAL_VARIANTS.map((v) => [v.id, v]));
  parameters = new Map<string, Parameter>(INITIAL_PARAMETERS.map((p) => [p.id, p]));
  generatedDocs = new Map<string, GeneratedDocument>();
  auditLogs: AuditLog[] = [];
  storageFiles = new Map<string, Uint8Array>();

  reset() {
    this.profiles = new Map(INITIAL_PROFILES.map((p) => [p.id, p]));
    this.kits = new Map(INITIAL_KITS.map((k) => [k.id, k]));
    this.documents = new Map(INITIAL_DOCUMENTS.map((d) => [d.id, d]));
    this.clauses = new Map(INITIAL_CLAUSES.map((c) => [c.id, c]));
    this.variants = new Map(INITIAL_VARIANTS.map((v) => [v.id, v]));
    this.parameters = new Map(INITIAL_PARAMETERS.map((p) => [p.id, p]));
    this.generatedDocs.clear();
    this.auditLogs = [];
    this.storageFiles.clear();
  }
}

export const dataStore = new MemoryDataStore();

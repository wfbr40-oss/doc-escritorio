import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import {
  dataStore,
  DocumentItem,
  INITIAL_CLAUSES,
  INITIAL_DOCUMENTS,
  INITIAL_KITS,
  INITIAL_PARAMETERS,
  INITIAL_VARIANTS,
  Kit,
  Clause,
  ClauseVariant,
  Parameter,
  TemplateContent,
} from '@/src/lib/supabase/store';
import { createTemplateDocx } from '@/src/lib/docx/builder';
import { obterMolduraPadrao } from '@/src/lib/docx/default-molduras';

export interface CatalogSnapshot {
  kits: Kit[];
  documents: DocumentItem[];
  clauses: Clause[];
  variants: ClauseVariant[];
  parameters: Parameter[];
}

type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

/**
 * Garante que o kit informado exista na tabela public.kits do Supabase antes de salvar documentos vinculados.
 */
export async function ensureKitExistsInSupabase(
  supabase: SupabaseClientType,
  kitId: string
): Promise<{ error: { code?: string; message?: string } | null }> {
  const kit = dataStore.kits.get(kitId) || INITIAL_KITS.find((k) => k.id === kitId);
  if (!kit) {
    return { error: null };
  }

  const { error } = await supabase
    .from('kits')
    .upsert(
      {
        id: kit.id,
        name: kit.name,
        description: kit.description || '',
        created_at: kit.created_at,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  return { error };
}

/**
 * Garante que um documento (e seu kit pai) exista em public.documents antes de registrar documentos gerados.
 */
export async function ensureDocumentExistsInSupabase(
  supabase: SupabaseClientType,
  doc: DocumentItem
): Promise<{ error: { code?: string; message?: string } | null }> {
  const kitRes = await ensureKitExistsInSupabase(supabase, doc.kit_id);
  if (kitRes.error) return kitRes;

  const { error } = await supabase
    .from('documents')
    .upsert(
      {
        id: doc.id,
        kit_id: doc.kit_id,
        name: doc.name,
        kind: doc.kind,
        template_file_path: doc.template_file_path,
        order_index: doc.order_index,
        created_at: doc.created_at,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  return { error };
}

/**
 * Semeia kits, documentos, cláusulas, variantes e parâmetros iniciais no Supabase quando o catálogo ainda está vazio.
 */
export async function ensureSeedCatalogInSupabase(
  supabase: SupabaseClientType
): Promise<void> {
  try {
    const kitsPayload = INITIAL_KITS.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      created_at: k.created_at,
    }));
    const { error: kitErr } = await supabase
      .from('kits')
      .upsert(kitsPayload, { onConflict: 'id', ignoreDuplicates: true });
    if (kitErr) return;

    const docsPayload = INITIAL_DOCUMENTS.map((d) => ({
      id: d.id,
      kit_id: d.kit_id,
      name: d.name,
      kind: d.kind,
      template_file_path: d.template_file_path,
      order_index: d.order_index,
      created_at: d.created_at,
    }));
    await supabase
      .from('documents')
      .upsert(docsPayload, { onConflict: 'id', ignoreDuplicates: true });

    await supabase.from('clauses').upsert(
      INITIAL_CLAUSES.map((c) => ({
        id: c.id,
        document_id: c.document_id,
        name: c.name,
        key: c.key,
        created_at: c.created_at,
      })),
      { onConflict: 'id', ignoreDuplicates: true }
    );

    await supabase.from('clause_variants').upsert(
      INITIAL_VARIANTS.map((v) => ({
        id: v.id,
        clause_id: v.clause_id,
        key: v.key,
        name: v.name,
        text_paragraphs: v.text_paragraphs,
        is_default: v.is_default,
        created_at: v.created_at,
      })),
      { onConflict: 'id', ignoreDuplicates: true }
    );

    await supabase.from('parameters').upsert(
      INITIAL_PARAMETERS.map((p) => ({
        id: p.id,
        document_id: p.document_id,
        key: p.key,
        label: p.label,
        default_value: p.default_value,
        created_at: p.created_at,
      })),
      { onConflict: 'id', ignoreDuplicates: true }
    );
  } catch {
    // Semeadura automática ignora erros caso o usuário atual não tenha permissão de escrita
  }
}

/**
 * Garante sincronização inicial segura entre Supabase e dataStore em memória.
 * Nunca lança erro caso o banco remoto não tenha dados ou colunas estendidas ainda.
 */
export async function syncCatalogFromSupabase(options?: {
  seedIfEmpty?: boolean;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = await createClient();

    let [kitsRes, docsExtRes, clausesRes, variantsRes, paramsRes] = await Promise.all([
      supabase.from('kits').select('id, name, description, created_at').order('created_at', { ascending: true }),
      supabase
        .from('documents')
        .select('id, kit_id, name, kind, template_file_path, template_content, order_index, created_at')
        .order('order_index', { ascending: true }),
      supabase.from('clauses').select('id, document_id, name, key, created_at'),
      supabase.from('clause_variants').select('id, clause_id, key, name, text_paragraphs, is_default, created_at'),
      supabase.from('parameters').select('id, document_id, key, label, default_value, created_at'),
    ]);

    if (!kitsRes.error && kitsRes.data && kitsRes.data.length === 0 && options?.seedIfEmpty) {
      await ensureSeedCatalogInSupabase(supabase);
      [kitsRes, docsExtRes, clausesRes, variantsRes, paramsRes] = await Promise.all([
        supabase.from('kits').select('id, name, description, created_at').order('created_at', { ascending: true }),
        supabase
          .from('documents')
          .select('id, kit_id, name, kind, template_file_path, template_content, order_index, created_at')
          .order('order_index', { ascending: true }),
        supabase.from('clauses').select('id, document_id, name, key, created_at'),
        supabase.from('clause_variants').select('id, clause_id, key, name, text_paragraphs, is_default, created_at'),
        supabase.from('parameters').select('id, document_id, key, label, default_value, created_at'),
      ]);
    }

    const docsRes = !docsExtRes.error
      ? docsExtRes
      : await supabase
          .from('documents')
          .select('id, kit_id, name, kind, template_file_path, order_index, created_at')
          .order('order_index', { ascending: true });

    if (!kitsRes.error && kitsRes.data && kitsRes.data.length > 0) {
      dataStore.kits = new Map(
        kitsRes.data.map((k) => [
          k.id,
          {
            id: k.id,
            name: k.name,
            description: k.description || '',
            created_at: k.created_at,
          },
        ])
      );
    }

    if (!docsRes.error && docsRes.data && docsRes.data.length > 0) {
      dataStore.documents = new Map(
        docsRes.data.map((d) => {
          const existing = dataStore.documents.get(d.id);
          const rawContent = 'template_content' in d ? (d.template_content as TemplateContent | null) : null;
          return [
            d.id,
            {
              id: d.id,
              kit_id: d.kit_id,
              name: d.name,
              kind: d.kind as 'template' | 'static',
              template_file_path: d.template_file_path || `molduras/${d.id}.docx`,
              template_content: rawContent ?? existing?.template_content ?? null,
              order_index: d.order_index ?? 0,
              created_at: d.created_at,
            },
          ];
        })
      );
    }

    if (!clausesRes.error && clausesRes.data && clausesRes.data.length > 0) {
      dataStore.clauses = new Map(
        clausesRes.data.map((c) => [
          c.id,
          {
            id: c.id,
            document_id: c.document_id,
            name: c.name,
            key: c.key,
            created_at: c.created_at,
          },
        ])
      );
    }

    if (!variantsRes.error && variantsRes.data && variantsRes.data.length > 0) {
      dataStore.variants = new Map(
        variantsRes.data.map((v) => [
          v.id,
          {
            id: v.id,
            clause_id: v.clause_id,
            key: v.key,
            name: v.name,
            text_paragraphs: Array.isArray(v.text_paragraphs) ? (v.text_paragraphs as string[]) : [],
            is_default: Boolean(v.is_default),
            created_at: v.created_at,
          },
        ])
      );
    }

    if (!paramsRes.error && paramsRes.data && paramsRes.data.length > 0) {
      dataStore.parameters = new Map(
        paramsRes.data.map((p) => [
          p.id,
          {
            id: p.id,
            document_id: p.document_id,
            key: p.key,
            label: p.label,
            default_value: p.default_value,
            created_at: p.created_at,
          },
        ])
      );
    }
  } catch {
    // Mantém catálogo em memória caso o Supabase esteja indisponível ou sem tabelas semeadas
  }
}

export function isKitAllowedForUser(
  kitId: string,
  user?: { role: 'user' | 'admin'; allowed_kit_ids?: string[] | null } | null
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!user.allowed_kit_ids || user.allowed_kit_ids.length === 0) return true;
  return user.allowed_kit_ids.includes(kitId);
}

export async function getCatalogForUser(user?: {
  role: 'user' | 'admin';
  allowed_kit_ids?: string[] | null;
} | null): Promise<CatalogSnapshot> {
  await syncCatalogFromSupabase();

  const allKits = Array.from(dataStore.kits.values()).sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const kits = user
    ? allKits.filter((k) => isKitAllowedForUser(k.id, user))
    : allKits;

  const allowedKitSet = new Set(kits.map((k) => k.id));
  const documents = Array.from(dataStore.documents.values())
    .filter((d) => allowedKitSet.has(d.kit_id))
    .sort((a, b) => a.order_index - b.order_index || a.created_at.localeCompare(b.created_at));

  const docIds = new Set(documents.map((d) => d.id));
  const clauses = Array.from(dataStore.clauses.values()).filter((c) =>
    docIds.has(c.document_id)
  );
  const clauseIds = new Set(clauses.map((c) => c.id));
  const variants = Array.from(dataStore.variants.values()).filter((v) =>
    clauseIds.has(v.clause_id)
  );
  const parameters = Array.from(dataStore.parameters.values()).filter((p) =>
    docIds.has(p.document_id)
  );

  return {
    kits,
    documents,
    clauses,
    variants,
    parameters,
  };
}

/**
 * Obtém os bytes da moldura DOCX de um documento:
 * 1) Arquivo customizado salvo em memória ou no Storage 'molduras'
 * 2) Conteúdo estruturado (título/subtítulo/parágrafos) editado pelo administrador
 * 3) Moldura padrão homologada do código
 */
export async function obterMolduraDocumento(docDef: DocumentItem): Promise<Uint8Array> {
  const storageKey = docDef.template_file_path || `molduras/${docDef.id}.docx`;
  const inMemory = dataStore.storageFiles.get(storageKey);
  if (inMemory) {
    return inMemory;
  }

  if (isSupabaseConfigured() && storageKey) {
    try {
      const supabase = await createClient();
      const objectPath = storageKey.startsWith('molduras/')
        ? storageKey.slice('molduras/'.length)
        : storageKey;
      const { data, error } = await supabase.storage.from('molduras').download(objectPath);
      if (!error && data) {
        const buffer = new Uint8Array(await data.arrayBuffer());
        dataStore.storageFiles.set(storageKey, buffer);
        return buffer;
      }
    } catch {
      // Fallback para template_content ou padrão
    }
  }

  if (docDef.template_content && docDef.template_content.paragrafos?.length > 0) {
    return createTemplateDocx(
      docDef.template_content.titulo || docDef.name,
      docDef.template_content.paragrafos,
      { subtitulo: docDef.template_content.subtitulo }
    );
  }

  const builtInIds = new Set([
    'doc_procuracao',
    'doc_contrato_honorarios',
    'doc_hipossuficiencia',
    'doc_renuncia_jef',
    'doc_requerimento_inss',
    'doc_ciencia_tramitacao',
    'doc_declaracao_residencia',
    'doc_cadastro_estatico',
  ]);

  if (builtInIds.has(docDef.id)) {
    return obterMolduraPadrao(docDef.id);
  }

  // Fallback seguro para documento recém-criado sem upload prévio
  return createTemplateDocx(
    docDef.name.toUpperCase(),
    docDef.kind === 'static'
      ? ['Documento estático configurado no escritório.']
      : [
          'OUTORGANTE / REQUERENTE: {{CLIENTE_NOME}}, {{CLIENTE_QUALIFICACAO}}.',
          '{{ASSINATURA_LOCAL_DATA}}',
          '______________________________________________________',
          '{{CLIENTE_NOME}}',
        ]
  );
}

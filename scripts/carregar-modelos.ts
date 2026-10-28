import fs from 'fs';
import path from 'path';
import { dataStore } from '../src/lib/supabase/store';
import { createTemplateDocx } from '../src/lib/docx/builder';

export interface ManifestData {
  kit: {
    id: string;
    name: string;
    description: string;
  };
  documentos: Array<{
    id: string;
    name: string;
    kind: 'template' | 'static';
    template_file_path: string;
    order_index: number;
    parametros?: Array<{ key: string; label: string; default_value: string }>;
    clausulas?: Array<{
      key: string;
      name: string;
      variantes: Array<{
        key: string;
        name: string;
        is_default: boolean;
        text_paragraphs: string[];
      }>;
    }>;
  }>;
}

/**
 * Função idempotente para carregar modelos a partir do manifesto.
 */
export async function carregarModelos(manifestPath?: string): Promise<{
  kitId: string;
  totalDocumentos: number;
  totalTemplates: number;
  totalEstaticos: number;
}> {
  const filePath = manifestPath || path.resolve(process.cwd(), 'modelos/manifest.example.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const manifest: ManifestData = JSON.parse(raw);

  const now = new Date().toISOString();

  // 1. Kit
  dataStore.kits.set(manifest.kit.id, {
    id: manifest.kit.id,
    name: manifest.kit.name,
    description: manifest.kit.description,
    created_at: now,
  });

  let totalTemplates = 0;
  let totalEstaticos = 0;

  // 2. Documentos
  for (const doc of manifest.documentos) {
    if (doc.kind === 'static') {
      totalEstaticos++;
    } else {
      totalTemplates++;
    }

    dataStore.documents.set(doc.id, {
      id: doc.id,
      kit_id: manifest.kit.id,
      name: doc.name,
      kind: doc.kind,
      template_file_path: doc.template_file_path,
      order_index: doc.order_index,
      created_at: now,
    });

    // Parâmetros (idempotente)
    if (doc.parametros) {
      for (const p of doc.parametros) {
        const paramId = `param_${doc.id}_${p.key}`;
        dataStore.parameters.set(paramId, {
          id: paramId,
          document_id: doc.id,
          key: p.key,
          label: p.label,
          default_value: p.default_value,
          created_at: now,
        });
      }
    }

    // Cláusulas e Variantes (idempotente)
    if (doc.clausulas) {
      for (const c of doc.clausulas) {
        const clauseId = `clause_${doc.id}_${c.key}`;
        dataStore.clauses.set(clauseId, {
          id: clauseId,
          document_id: doc.id,
          name: c.name,
          key: c.key,
          created_at: now,
        });

        for (const v of c.variantes) {
          const variantId = `variant_${clauseId}_${v.key}`;
          dataStore.variants.set(variantId, {
            id: variantId,
            clause_id: clauseId,
            key: v.key,
            name: v.name,
            text_paragraphs: v.text_paragraphs,
            is_default: v.is_default,
            created_at: now,
          });
        }
      }
    }
  }

  return {
    kitId: manifest.kit.id,
    totalDocumentos: manifest.documentos.length,
    totalTemplates,
    totalEstaticos,
  };
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  carregarModelos().then((res) => {
    console.log(`[CARGA_MODELOS] Sucesso! Kit: ${res.kitId}, Total: ${res.totalDocumentos} (${res.totalTemplates} templates, ${res.totalEstaticos} estáticos).`);
  });
}

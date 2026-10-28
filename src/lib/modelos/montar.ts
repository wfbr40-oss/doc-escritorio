import { ClienteRender } from '../cliente/qualificacao';
import { RenderData } from '../docx/render';
import { formatDataExtenso } from '../cliente/data';
import {
  dataStore,
  INITIAL_PARAMETERS,
  INITIAL_VARIANTS,
  INITIAL_CLAUSES,
} from '../supabase/store';

export interface AjustesPontuais {
  valores?: Record<string, string>;
  clausulas?: Record<string, string[]>;
  assinatura?: {
    cidadeUf?: string;
    dataExtenso?: string;
  };
}

/**
 * Monta o objeto RenderData para um documento específico e variante escolhida.
 * Permite ajustes pontuais na geração sem alterar as tabelas originais de clause_variants.
 */
export async function montarRenderData(
  documentId: string,
  varianteId: string = 'padrao',
  cliente: ClienteRender,
  valoresPersonalizados: Record<string, string> = {},
  ajustes: AjustesPontuais = {}
): Promise<RenderData> {
  const doc = dataStore.documents.get(documentId);
  if (!doc) {
    throw new Error(`Documento '${documentId}' não encontrado.`);
  }

  // 1. Monta valores padrão a partir dos parâmetros do documento
  const valores: Record<string, string> = {};
  const parametros = Array.from(dataStore.parameters.values()).filter(
    (p) => p.document_id === documentId
  );

  for (const p of parametros) {
    valores[p.key] = p.default_value;
  }

  // Aplica valores personalizados informados pelo usuário na tela
  for (const [k, v] of Object.entries(valoresPersonalizados)) {
    if (v !== undefined && v !== null && v !== '') {
      valores[k] = v;
    }
  }

  // Aplica ajustes pontuais de valores
  if (ajustes.valores) {
    for (const [k, v] of Object.entries(ajustes.valores)) {
      valores[k] = v;
    }
  }

  // 2. Monta cláusulas dinâmicas da variante selecionada
  const clausulas: Record<string, string[]> = {};
  const docClauses = Array.from(dataStore.clauses.values()).filter(
    (c) => c.document_id === documentId
  );

  for (const clause of docClauses) {
    // Procura a variante correspondente ao varianteId ou default
    const variantsForClause = Array.from(dataStore.variants.values()).filter(
      (v) => v.clause_id === clause.id
    );

    let chosenVariant = variantsForClause.find((v) => v.key === varianteId);
    if (!chosenVariant) {
      chosenVariant = variantsForClause.find((v) => v.is_default) || variantsForClause[0];
    }

    if (chosenVariant) {
      clausulas[clause.key] = [...chosenVariant.text_paragraphs];
    }
  }

  // Aplica ajustes pontuais de cláusulas (sem alterar o dataStore)
  if (ajustes.clausulas) {
    for (const [k, v] of Object.entries(ajustes.clausulas)) {
      clausulas[k] = [...v];
    }
  }

  // 3. Monta dados de assinatura (cidade e data)
  const cidadePadrao = cliente.cidadeUf || 'Macapá/AP';
  const dataExtensoPadrao = formatDataExtenso(new Date());

  const assinatura = {
    cidadeUf: ajustes.assinatura?.cidadeUf || cidadePadrao,
    dataExtenso: ajustes.assinatura?.dataExtenso || dataExtensoPadrao,
  };

  return {
    cliente,
    valores,
    clausulas,
    assinatura,
  };
}

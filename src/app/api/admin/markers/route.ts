import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseWriteError,
  requireAdminSession,
} from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { CustomMarker, dataStore, Parameter } from '@/src/lib/supabase/store';
import {
  CUSTOM_MARKER_KEY_PREFIX,
  ensureDocumentExistsInSupabase,
  resolveAnchorDocumentIdForSupabase,
  syncCatalogFromSupabase,
} from '@/src/lib/modelos/catalog';
import { MARCADORES_PADRAO } from '@/src/lib/docx/marcadores';
import { logSeguro } from '@/src/lib/logs/seguro';

function sanitizeValorKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sanitizeCustomKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase({ seedIfEmpty: true });
    const body = await req.json();
    const kind: 'valor' | 'custom' = body.kind === 'custom' ? 'custom' : 'valor';
    const rawKey = typeof body.key === 'string' ? body.key : '';
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const value =
      typeof body.default_value === 'string'
        ? body.default_value.trim()
        : typeof body.value === 'string'
          ? body.value.trim()
          : '';
    const now = new Date().toISOString();

    if (kind === 'valor') {
      const key = sanitizeValorKey(rawKey);
      if (key.length < 2) {
        return NextResponse.json(
          { erro: 'A chave do marcador de valor deve ter ao menos 2 caracteres (letras, números ou _).' },
          { status: 400 }
        );
      }

      const documentId =
        typeof body.document_id === 'string' && body.document_id.trim()
          ? body.document_id.trim()
          : 'doc_contrato_honorarios';

      const doc = dataStore.documents.get(documentId) || Array.from(dataStore.documents.values())[0];
      if (!doc) {
        return NextResponse.json(
          { erro: 'Nenhum documento disponível para vincular o marcador de valor.' },
          { status: 400 }
        );
      }

      const duplicado = Array.from(dataStore.parameters.values()).find(
        (p) => p.document_id === doc.id && p.key === key
      );
      if (duplicado) {
        return NextResponse.json(
          { erro: `Já existe um marcador {{VALOR:${key}}} vinculado a este documento.` },
          { status: 409 }
        );
      }

      const nextIndex =
        Array.from(dataStore.parameters.values()).filter((p) => p.key.startsWith('minimo_') || p.label.startsWith('Mín. Honorários')).length + 1;
      const finalLabel = label || `Mín. Honorários ${nextIndex}`;
      const id = `param_${crypto.randomUUID().slice(0, 8)}`;

      const param: Parameter = {
        id,
        document_id: doc.id,
        key,
        label: finalLabel,
        default_value: value || '0,00',
        created_at: now,
      };

      if (isSupabaseConfigured()) {
        const supabase = await createClient();
        const ensureRes = await ensureDocumentExistsInSupabase(supabase, doc);
        if (ensureRes.error) {
          return NextResponse.json(
            {
              erro: formatSupabaseWriteError(
                ensureRes.error,
                'Não foi possível validar o documento pai no Supabase.'
              ),
            },
            { status: ensureRes.error.code === '42501' ? 403 : 500 }
          );
        }

        const { error } = await supabase.from('parameters').insert({
          id: param.id,
          document_id: param.document_id,
          key: param.key,
          label: param.label,
          default_value: param.default_value,
          created_at: param.created_at,
        });
        if (error) {
          return NextResponse.json(
            { erro: formatSupabaseWriteError(error, 'Não foi possível salvar o marcador no Supabase.') },
            { status: error.code === '42501' ? 403 : 500 }
          );
        }

        await supabase.from('audit_log').insert({
          user_id: auth.session.id,
          action: 'admin_marcador_valor_criado',
          target_id: param.id,
          metadata: { key: param.key, documentId: param.document_id },
        });
      }

      dataStore.parameters.set(param.id, param);
      dataStore.auditLogs.unshift({
        id: crypto.randomUUID(),
        user_id: auth.session.id,
        user_name: auth.session.name,
        action: 'admin_marcador_valor_criado',
        target_id: param.id,
        metadata: { key: param.key, documentId: param.document_id },
        created_at: now,
      });

      logSeguro('admin_marcador_valor_criado', { userId: auth.session.id, ids: [param.id] });
      return NextResponse.json({ ok: true, kind: 'valor', parameter: param }, { status: 201 });
    }

    // Marcador personalizado {{CHAVE}}
    const key = sanitizeCustomKey(rawKey);
    if (key.length < 2) {
      return NextResponse.json(
        { erro: 'A chave do marcador personalizado deve ter ao menos 2 caracteres (ex.: ESCRITORIO_OAB).' },
        { status: 400 }
      );
    }

    if (MARCADORES_PADRAO.has(key) || key.startsWith('VALOR') || key.startsWith('CLAUSULA')) {
      return NextResponse.json(
        { erro: `A chave {{${key}}} é reservada pelo sistema.` },
        { status: 400 }
      );
    }

    const dupCustom = Array.from(dataStore.customMarkers.values()).find((m) => m.key === key);
    if (dupCustom) {
      return NextResponse.json(
        { erro: `Já existe um marcador personalizado com a chave {{${key}}}.` },
        { status: 409 }
      );
    }

    if (!label) {
      return NextResponse.json(
        { erro: 'Informe uma descrição ou rótulo para o marcador personalizado.' },
        { status: 400 }
      );
    }

    const id = `custom_${crypto.randomUUID().slice(0, 8)}`;
    const marker: CustomMarker = {
      id,
      key,
      label,
      value,
      created_at: now,
    };

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const anchor = await resolveAnchorDocumentIdForSupabase(supabase);
      if (anchor.error || !anchor.documentId) {
        return NextResponse.json(
          {
            erro: anchor.error
              ? formatSupabaseWriteError(
                  anchor.error,
                  'Não foi possível localizar documento âncora no Supabase.'
                )
              : 'Cadastre ao menos um modelo de documento antes de criar marcadores personalizados.',
          },
          { status: anchor.error?.code === '42501' ? 403 : 400 }
        );
      }

      const { error } = await supabase.from('parameters').insert({
        id: marker.id,
        document_id: anchor.documentId,
        key: `${CUSTOM_MARKER_KEY_PREFIX}${marker.key}`,
        label: marker.label,
        default_value: marker.value,
        created_at: marker.created_at,
      });

      if (error) {
        return NextResponse.json(
          {
            erro: formatSupabaseWriteError(
              error,
              'Não foi possível salvar o marcador personalizado no Supabase.'
            ),
          },
          { status: error.code === '42501' ? 403 : 500 }
        );
      }

      await supabase.from('audit_log').insert({
        user_id: auth.session.id,
        action: 'admin_marcador_personalizado_criado',
        target_id: marker.id,
        metadata: { key: marker.key },
      });
    }

    dataStore.customMarkers.set(marker.id, marker);
    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_marcador_personalizado_criado',
      target_id: marker.id,
      metadata: { key: marker.key },
      created_at: now,
    });

    logSeguro('admin_marcador_personalizado_criado', {
      userId: auth.session.id,
      ids: [marker.id],
    });
    return NextResponse.json({ ok: true, kind: 'custom', customMarker: marker }, { status: 201 });
  } catch (error) {
    logSeguro('admin_marcador_create_erro', { erro: String(error) });
    return NextResponse.json({ erro: 'Erro ao criar marcador.' }, { status: 500 });
  }
}

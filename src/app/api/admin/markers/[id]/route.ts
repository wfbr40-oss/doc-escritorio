import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseWriteError,
  requireAdminSession,
} from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore } from '@/src/lib/supabase/store';
import {
  CUSTOM_MARKER_KEY_PREFIX,
  ensureDocumentExistsInSupabase,
  resolveAnchorDocumentIdForSupabase,
  syncCatalogFromSupabase,
} from '@/src/lib/modelos/catalog';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase({ seedIfEmpty: true });
    const { id } = await context.params;
    const body = await req.json();

    const customExistente = dataStore.customMarkers.get(id);
    if (customExistente) {
      const label =
        typeof body.label === 'string' && body.label.trim()
          ? body.label.trim()
          : customExistente.label;
      const value =
        typeof body.value === 'string'
          ? body.value.trim()
          : typeof body.default_value === 'string'
            ? body.default_value.trim()
            : customExistente.value;

      const atualizado = { ...customExistente, label, value };

      if (isSupabaseConfigured()) {
        const supabase = await createClient();
        const anchor = await resolveAnchorDocumentIdForSupabase(supabase);
        if (anchor.error || !anchor.documentId) {
          return NextResponse.json(
            {
              erro: anchor.error
                ? formatSupabaseWriteError(anchor.error, 'Erro ao validar documento no Supabase.')
                : 'Nenhum documento disponível.',
            },
            { status: 500 }
          );
        }

        const { error } = await supabase.from('parameters').upsert(
          {
            id: atualizado.id,
            document_id: anchor.documentId,
            key: `${CUSTOM_MARKER_KEY_PREFIX}${atualizado.key}`,
            label: atualizado.label,
            default_value: atualizado.value,
            created_at: atualizado.created_at,
          },
          { onConflict: 'id' }
        );
        if (error) {
          return NextResponse.json(
            { erro: formatSupabaseWriteError(error, 'Erro ao atualizar marcador no Supabase.') },
            { status: error.code === '42501' ? 403 : 500 }
          );
        }
      }

      dataStore.customMarkers.set(id, atualizado);
      logSeguro('admin_marcador_personalizado_atualizado', { userId: auth.session.id, ids: [id] });
      return NextResponse.json({ ok: true, kind: 'custom', customMarker: atualizado });
    }

    const paramExistente = dataStore.parameters.get(id);
    if (!paramExistente) {
      return NextResponse.json({ erro: 'Marcador não encontrado.' }, { status: 404 });
    }

    const label =
      typeof body.label === 'string' && body.label.trim()
        ? body.label.trim()
        : paramExistente.label;
    const defaultValue =
      typeof body.default_value === 'string'
        ? body.default_value.trim()
        : typeof body.value === 'string'
          ? body.value.trim()
          : paramExistente.default_value;
    const documentId =
      typeof body.document_id === 'string' && dataStore.documents.has(body.document_id.trim())
        ? body.document_id.trim()
        : paramExistente.document_id;

    const atualizado = {
      ...paramExistente,
      label,
      default_value: defaultValue,
      document_id: documentId,
    };

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const doc = dataStore.documents.get(atualizado.document_id);
      if (doc) {
        const ensureRes = await ensureDocumentExistsInSupabase(supabase, doc);
        if (ensureRes.error) {
          return NextResponse.json(
            { erro: formatSupabaseWriteError(ensureRes.error, 'Erro ao validar documento no Supabase.') },
            { status: ensureRes.error.code === '42501' ? 403 : 500 }
          );
        }
      }

      const { error } = await supabase.from('parameters').upsert(
        {
          id: atualizado.id,
          document_id: atualizado.document_id,
          key: atualizado.key,
          label: atualizado.label,
          default_value: atualizado.default_value,
          created_at: atualizado.created_at,
        },
        { onConflict: 'id' }
      );
      if (error) {
        return NextResponse.json(
          { erro: formatSupabaseWriteError(error, 'Erro ao atualizar marcador no Supabase.') },
          { status: error.code === '42501' ? 403 : 500 }
        );
      }
    }

    dataStore.parameters.set(id, atualizado);
    logSeguro('admin_marcador_valor_atualizado', { userId: auth.session.id, ids: [id] });
    return NextResponse.json({ ok: true, kind: 'valor', parameter: atualizado });
  } catch (error) {
    logSeguro('admin_marcador_update_erro', { erro: String(error) });
    return NextResponse.json({ erro: 'Erro ao atualizar marcador.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase({ seedIfEmpty: true });
    const { id } = await context.params;

    const customExistente = dataStore.customMarkers.get(id);
    const paramExistente = dataStore.parameters.get(id);

    if (!customExistente && !paramExistente) {
      return NextResponse.json({ erro: 'Marcador não encontrado.' }, { status: 404 });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { error } = await supabase.from('parameters').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          { erro: formatSupabaseWriteError(error, 'Erro ao excluir marcador no Supabase.') },
          { status: error.code === '42501' ? 403 : 500 }
        );
      }

      await supabase.from('audit_log').insert({
        user_id: auth.session.id,
        action: 'admin_marcador_excluido',
        target_id: id,
      });
    }

    if (customExistente) dataStore.customMarkers.delete(id);
    if (paramExistente) dataStore.parameters.delete(id);

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_marcador_excluido',
      target_id: id,
      created_at: new Date().toISOString(),
    });

    logSeguro('admin_marcador_excluido', { userId: auth.session.id, ids: [id] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logSeguro('admin_marcador_delete_erro', { erro: String(error) });
    return NextResponse.json({ erro: 'Erro ao excluir marcador.' }, { status: 500 });
  }
}

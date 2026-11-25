import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  formatSupabaseWriteError,
  requireAdminSession,
} from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import {
  dataStore,
  DEFAULT_QUALIFICACAO_STORE_CONTRATO,
  DEFAULT_QUALIFICACAO_STORE_ROTULOS,
} from '@/src/lib/supabase/store';
import {
  resolveAnchorDocumentIdForSupabase,
  syncCatalogFromSupabase,
  SYS_QUALIFICACAO_CONTRATO_ID,
  SYS_QUALIFICACAO_CONTRATO_KEY,
  SYS_QUALIFICACAO_ROTULOS_ID,
  SYS_QUALIFICACAO_ROTULOS_KEY,
} from '@/src/lib/modelos/catalog';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function PUT(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    await syncCatalogFromSupabase({ seedIfEmpty: true });
    const body = await req.json();

    const reset = Boolean(body.reset);
    const contrato = reset
      ? DEFAULT_QUALIFICACAO_STORE_CONTRATO
      : typeof body.contrato === 'string'
        ? body.contrato.trim()
        : dataStore.qualificacaoConfig.contrato;
    const rotulos = reset
      ? DEFAULT_QUALIFICACAO_STORE_ROTULOS
      : typeof body.rotulos === 'string'
        ? body.rotulos.trim()
        : dataStore.qualificacaoConfig.rotulos;

    if (!contrato || contrato.length < 10) {
      return NextResponse.json(
        { erro: 'O modelo do texto de qualificação completa é obrigatório.' },
        { status: 400 }
      );
    }

    if (!rotulos || rotulos.length < 10) {
      return NextResponse.json(
        { erro: 'O modelo do texto de qualificação em rótulos é obrigatório.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const anchor = await resolveAnchorDocumentIdForSupabase(supabase);
      if (anchor.error || !anchor.documentId) {
        return NextResponse.json(
          {
            erro: anchor.error
              ? formatSupabaseWriteError(
                  anchor.error,
                  'Não foi possível validar o documento âncora no Supabase.'
                )
              : 'Cadastre ao menos um documento antes de salvar a qualificação.',
          },
          { status: anchor.error?.code === '42501' ? 403 : 400 }
        );
      }

      const { error } = await supabase.from('parameters').upsert(
        [
          {
            id: SYS_QUALIFICACAO_CONTRATO_ID,
            document_id: anchor.documentId,
            key: SYS_QUALIFICACAO_CONTRATO_KEY,
            label: 'Qualificação Jurídica Completa',
            default_value: contrato,
            created_at: now,
          },
          {
            id: SYS_QUALIFICACAO_ROTULOS_ID,
            document_id: anchor.documentId,
            key: SYS_QUALIFICACAO_ROTULOS_KEY,
            label: 'Qualificação em Rótulos',
            default_value: rotulos,
            created_at: now,
          },
        ],
        { onConflict: 'id' }
      );

      if (error) {
        return NextResponse.json(
          {
            erro: formatSupabaseWriteError(
              error,
              'Não foi possível salvar o texto de qualificação no Supabase.'
            ),
          },
          { status: error.code === '42501' ? 403 : 500 }
        );
      }

      await supabase.from('audit_log').insert({
        user_id: auth.session.id,
        action: reset ? 'admin_qualificacao_restaurada' : 'admin_qualificacao_atualizada',
        target_id: SYS_QUALIFICACAO_CONTRATO_ID,
      });
    }

    dataStore.qualificacaoConfig = {
      contrato,
      rotulos,
    };

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: reset ? 'admin_qualificacao_restaurada' : 'admin_qualificacao_atualizada',
      target_id: SYS_QUALIFICACAO_CONTRATO_ID,
      created_at: now,
    });

    logSeguro('admin_qualificacao_atualizada', { userId: auth.session.id });
    return NextResponse.json({
      ok: true,
      qualificacaoConfig: { ...dataStore.qualificacaoConfig },
    });
  } catch (error) {
    logSeguro('admin_qualificacao_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Erro ao salvar configuração do texto de qualificação.' },
      { status: 500 }
    );
  }
}

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/src/lib/supabase/admin-guard';
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase/server';
import { dataStore, Profile } from '@/src/lib/supabase/store';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const nextRole: 'user' | 'admin' | undefined =
      body.role === 'admin' || body.role === 'user' ? body.role : undefined;
    const nextAtivo: boolean | undefined =
      typeof body.ativo === 'boolean' ? body.ativo : undefined;
    const nextName: string | undefined =
      typeof body.name === 'string' && body.name.trim().length >= 2
        ? body.name.trim()
        : undefined;
    const nextAllowedKits: string[] | null | undefined =
      body.allowed_kit_ids === null
        ? null
        : Array.isArray(body.allowed_kit_ids)
          ? body.allowed_kit_ids.map((k: unknown) => String(k))
          : undefined;

    // Impede o próprio administrador de remover seu acesso de administrador ou se bloquear
    if (id === auth.session.id) {
      if (nextRole === 'user') {
        return NextResponse.json(
          { erro: 'Você não pode rebaixar o seu próprio cargo de administrador.' },
          { status: 400 }
        );
      }
      if (nextAtivo === false) {
        return NextResponse.json(
          { erro: 'Você não pode desativar o seu próprio acesso.' },
          { status: 400 }
        );
      }
    }

    let existente = dataStore.profiles.get(id);

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const currentRes = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', id)
        .single();

      if (currentRes.error && !existente) {
        return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
      }

      if (currentRes.data && !existente) {
        existente = {
          id: currentRes.data.id,
          name: currentRes.data.name,
          email: '—',
          role: currentRes.data.role === 'admin' ? 'admin' : 'user',
          ativo: true,
          allowed_kit_ids: null,
          created_at: new Date().toISOString(),
        };
      }

      const updatePayload: Record<string, unknown> = {};
      if (nextName !== undefined) updatePayload.name = nextName;
      if (nextRole !== undefined) updatePayload.role = nextRole;
      if (nextAtivo !== undefined) updatePayload.ativo = nextAtivo;
      if (nextAllowedKits !== undefined) updatePayload.allowed_kit_ids = nextAllowedKits;

      const extUpdate = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', id);

      if (extUpdate.error) {
        // Fallback caso migração 0007 não tenha sido aplicada ainda
        const basicPayload: Record<string, unknown> = {};
        if (nextName !== undefined) basicPayload.name = nextName;
        if (nextRole !== undefined) basicPayload.role = nextRole;

        if (Object.keys(basicPayload).length > 0) {
          const basicUpdate = await supabase
            .from('profiles')
            .update(basicPayload)
            .eq('id', id);
          if (basicUpdate.error) {
            return NextResponse.json(
              { erro: 'Não foi possível atualizar o usuário no banco de dados.' },
              { status: 500 }
            );
          }
        }
      }
    } else if (!existente) {
      return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
    }

    const atualizado: Profile = {
      ...(existente as Profile),
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(nextRole !== undefined ? { role: nextRole } : {}),
      ...(nextAtivo !== undefined ? { ativo: nextAtivo } : {}),
      ...(nextAllowedKits !== undefined ? { allowed_kit_ids: nextAllowedKits } : {}),
    };

    dataStore.profiles.set(id, atualizado);

    // Se usuário foi desativado, revoga sessões locais ativas
    if (atualizado.ativo === false) {
      for (const [token, sessionRec] of dataStore.sessions.entries()) {
        if (sessionRec.user_id === id) {
          dataStore.sessions.delete(token);
        }
      }
    }

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_usuario_atualizado',
      target_id: id,
      metadata: {
        role: atualizado.role,
        ativo: atualizado.ativo,
      },
      created_at: new Date().toISOString(),
    });

    logSeguro('admin_usuario_atualizado', { userId: auth.session.id, ids: [id] });
    return NextResponse.json({ ok: true, user: atualizado });
  } catch (error) {
    logSeguro('admin_usuario_update_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Erro ao atualizar permissões do usuário.' },
      { status: 500 }
    );
  }
}

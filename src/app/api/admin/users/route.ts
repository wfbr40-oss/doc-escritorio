import crypto from 'crypto';
import { createClient as createSupabaseStandalone } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/src/lib/supabase/admin-guard';
import {
  createClient,
  getSupabasePublicKey,
  isSupabaseConfigured,
} from '@/src/lib/supabase/server';
import { dataStore, hashPassword, Profile } from '@/src/lib/supabase/store';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role: 'user' | 'admin' = body.role === 'admin' ? 'admin' : 'user';
    const ativo = body.ativo !== false;
    const allowedKitIds: string[] | null = Array.isArray(body.allowed_kit_ids)
      ? body.allowed_kit_ids.map((k: unknown) => String(k))
      : null;

    if (name.length < 2) {
      return NextResponse.json(
        { erro: 'Informe o nome completo do usuário.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { erro: 'Informe um endereço de e-mail válido.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { erro: 'A senha inicial deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    let createdUserId = '';

    if (isSupabaseConfigured()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = getSupabasePublicKey()!;

      // Cliente isolado sem persistência de sessão para não substituir os cookies do admin logado
      const ephemeralClient = createSupabaseStandalone(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data, error } = await ephemeralClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error || !data.user) {
        const msg = error?.message?.toLowerCase() || '';
        const isDuplicate = msg.includes('already') || msg.includes('registered');
        return NextResponse.json(
          {
            erro: isDuplicate
              ? 'Já existe um usuário cadastrado com este e-mail.'
              : 'Não foi possível criar o usuário no Supabase Auth.',
          },
          { status: isDuplicate ? 409 : 400 }
        );
      }

      createdUserId = data.user.id;

      // Atualiza o perfil no banco com a sessão autenticada do administrador
      const adminClient = await createClient();
      const extUpsert = await adminClient.from('profiles').upsert({
        id: createdUserId,
        name,
        email,
        role,
        ativo,
        allowed_kit_ids: allowedKitIds,
      });

      if (extUpsert.error) {
        await adminClient.from('profiles').upsert({
          id: createdUserId,
          name,
          role,
        });
      }
    } else {
      const duplicado = Array.from(dataStore.profiles.values()).find(
        (p) => p.email.toLowerCase() === email
      );
      if (duplicado) {
        return NextResponse.json(
          { erro: 'Já existe um usuário cadastrado com este e-mail.' },
          { status: 409 }
        );
      }

      createdUserId = crypto.randomUUID();
      dataStore.localCredentials.set(email, hashPassword(password));
    }

    const novoPerfil: Profile = {
      id: createdUserId,
      name,
      email,
      role,
      ativo,
      allowed_kit_ids: allowedKitIds,
      created_at: new Date().toISOString(),
    };

    dataStore.profiles.set(novoPerfil.id, novoPerfil);

    dataStore.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: auth.session.id,
      user_name: auth.session.name,
      action: 'admin_usuario_criado',
      target_id: novoPerfil.id,
      metadata: { role: novoPerfil.role, ativo: novoPerfil.ativo },
      created_at: new Date().toISOString(),
    });

    logSeguro('admin_usuario_criado', { userId: auth.session.id, ids: [novoPerfil.id] });
    return NextResponse.json({ ok: true, user: novoPerfil }, { status: 201 });
  } catch (error) {
    logSeguro('admin_usuario_create_erro', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Erro ao cadastrar usuário.' },
      { status: 500 }
    );
  }
}

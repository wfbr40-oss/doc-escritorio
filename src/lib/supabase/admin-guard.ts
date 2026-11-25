import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getSessionProfile, UserSessionProfile } from '@/src/lib/supabase/session';

export type AdminAuthResult =
  | { ok: true; session: UserSessionProfile }
  | { ok: false; response: NextResponse };

/**
 * Exige sessão autenticada com cargo estritamente 'admin'.
 */
export async function requireAdminSession(): Promise<AdminAuthResult> {
  const session = await getSessionProfile();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { erro: 'Acesso não autorizado. É necessário estar autenticado.' },
        { status: 401 }
      ),
    };
  }

  if (session.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { erro: 'Acesso restrito a administradores.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}

/**
 * Gera um identificador slug seguro e único a partir de um nome legível.
 */
export function slugifyId(prefix: string, name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${normalized || 'item'}_${suffix}`;
}

/**
 * Verifica se o nome do arquivo possui extensão .docx.
 */
export function isDocxFileName(fileName?: string | null): boolean {
  if (!fileName) return false;
  return fileName.trim().toLowerCase().endsWith('.docx');
}

/**
 * Valida se o buffer enviado é um arquivo .docx OpenXML válido contendo word/document.xml.
 */
export async function validateDocxBuffer(bytes: Uint8Array): Promise<boolean> {
  try {
    if (bytes.byteLength === 0 || bytes.byteLength > 15 * 1024 * 1024) {
      return false;
    }
    const zip = await JSZip.loadAsync(bytes);
    return Object.keys(zip.files).some(
      (entry) => entry.toLowerCase() === 'word/document.xml'
    );
  } catch {
    return false;
  }
}

/**
 * Traduz códigos de erro do Supabase/Postgres para mensagens claras em português.
 */
export function formatSupabaseWriteError(
  error: { code?: string; message?: string; statusCode?: string | number } | null | undefined,
  fallback: string
): string {
  if (!error) return fallback;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();

  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return "Permissão negada no Supabase. Confirme se seu usuário possui role = 'admin' na tabela profiles e se as políticas SQL foram aplicadas.";
  }
  if (code === '42P01' || msg.includes('does not exist')) {
    return 'Estrutura não encontrada no Supabase. Execute as migrações SQL do projeto no painel do Supabase.';
  }
  if (code === '23503' || msg.includes('foreign key')) {
    return 'Referência não encontrada no banco de dados (kit ou modelo pai inexistente).';
  }
  if (code === '23505' || msg.includes('duplicate key')) {
    return 'Já existe um registro com este identificador no Supabase.';
  }
  if (msg.includes('bucket') && msg.includes('not found')) {
    return "Bucket 'molduras' não encontrado no Storage do Supabase. Execute a migração 0003_storage.sql.";
  }

  return error.message ? `${fallback} (${error.message})` : fallback;
}

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
 * Valida se o buffer enviado é um arquivo .docx OpenXML válido contendo word/document.xml.
 */
export async function validateDocxBuffer(bytes: Uint8Array): Promise<boolean> {
  try {
    if (bytes.byteLength === 0 || bytes.byteLength > 15 * 1024 * 1024) {
      return false;
    }
    const zip = await JSZip.loadAsync(bytes);
    return Boolean(zip.file('word/document.xml'));
  } catch {
    return false;
  }
}

import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/src/lib/supabase/session';
import { getCatalogForUser } from '@/src/lib/modelos/catalog';

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  const catalog = await getCatalogForUser(session);
  return NextResponse.json(catalog);
}

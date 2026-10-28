import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/src/lib/supabase/session';

export async function POST() {
  const profile = await getSessionProfile();
  const response = NextResponse.json({ ok: true });

  response.cookies.delete('auth_session');

  return response;
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ usuario: null }, { status: 401 });
  }

  return NextResponse.json({ usuario: profile });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/src/lib/supabase/admin-guard';
import { dataStore } from '@/src/lib/supabase/store';
import { obterMolduraDocumento, syncCatalogFromSupabase } from '@/src/lib/modelos/catalog';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  await syncCatalogFromSupabase();
  const { id } = await context.params;
  const docDef = dataStore.documents.get(id);
  if (!docDef) {
    return NextResponse.json({ erro: 'Modelo não encontrado.' }, { status: 404 });
  }

  const bytes = await obterMolduraDocumento(docDef);
  const safeName = docDef.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  return new Response(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="moldura_${safeName}.docx"`,
    },
  });
}

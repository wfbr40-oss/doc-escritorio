import { NextRequest, NextResponse } from 'next/server';
import { purgeExpired } from '@/src/lib/retencao/purge';
import { logSeguro } from '@/src/lib/logs/seguro';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || 'teste-cron-secret';
  const authHeader = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');

  const providedSecret =
    authHeader?.replace(/^Bearer\s+/i, '') || querySecret;

  if (!providedSecret || providedSecret !== cronSecret) {
    logSeguro('cron_retencao_nao_autorizado', { erro: 'Chave CRON_SECRET ausente ou inválida' });
    return NextResponse.json(
      { erro: 'Acesso não autorizado ao cron de retenção.' },
      { status: 401 }
    );
  }

  try {
    const resultado = await purgeExpired(new Date());

    return NextResponse.json({
      ok: true,
      removidos: resultado.removidos,
      executadoEm: new Date().toISOString(),
    });
  } catch (error) {
    logSeguro('cron_retencao_falha', { erro: String(error) });
    return NextResponse.json(
      { erro: 'Falha durante o processamento da retenção.' },
      { status: 500 }
    );
  }
}

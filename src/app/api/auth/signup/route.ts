import { NextResponse } from 'next/server';
import { logSeguro } from '@/src/lib/logs/seguro';

/**
 * Endpoint de cadastro público.
 * Conforme especificação de segurança (Tarefa 1 e Global Constraints):
 * O cadastro público é expressamente desativado. Contas só podem ser provisionadas pelo administrador.
 */
export async function POST() {
  logSeguro('signup_tentativa_bloqueada', { erro: 'Cadastro público desativado pelo administrador' });

  return NextResponse.json(
    {
      erro: 'O cadastro público está desativado. Novos acessos devem ser solicitados diretamente à administração do escritório.',
      codigo: 'SIGNUP_DESATIVADO',
    },
    { status: 403 }
  );
}

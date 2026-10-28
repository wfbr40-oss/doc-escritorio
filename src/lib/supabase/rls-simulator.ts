import { UserSessionProfile } from './session';
import { dataStore } from './store';

/**
 * Validador das políticas de Row Level Security (RLS) refletindo as migrações 0002_rls.sql e 0003_storage.sql
 */
export class RlsSecurityEnforcer {
  /**
   * Verifica permissão de leitura em tabelas do sistema
   */
  static canSelect(table: string, session: UserSessionProfile | null): boolean {
    // Anon (sem sessão) não lê nenhuma tabela do sistema
    if (!session) return false;

    // Usuários autenticados (user ou admin) podem ler tabelas de modelos e gerados
    const readableTables = [
      'kits',
      'documents',
      'clauses',
      'clause_variants',
      'parameters',
      'model_versions',
      'generated_documents',
      'audit_log',
      'profiles',
    ];
    return readableTables.includes(table);
  }

  /**
   * Verifica permissão de inserção/atualização/remoção em cláusulas e variantes
   */
  static canWriteClauseVariants(session: UserSessionProfile | null): boolean {
    // Somente admin pode alterar clause_variants
    return !!session && session.role === 'admin';
  }

  /**
   * Verifica permissão de remoção em documentos gerados
   */
  static canDeleteGeneratedDocuments(session: UserSessionProfile | null): boolean {
    // Usuários comuns 'user' NUNCA podem excluir registros de generated_documents
    return !!session && session.role === 'admin';
  }

  /**
   * Verifica permissão de acesso ao Storage privado
   */
  static canAccessStorageBucket(bucket: string, session: UserSessionProfile | null, action: 'select' | 'insert' | 'delete'): boolean {
    // Storage é estritamente privado: anônimo nunca tem acesso direto
    if (!session) return false;

    if (bucket === 'molduras') {
      if (action === 'select') return true;
      return session.role === 'admin';
    }

    if (bucket === 'gerados') {
      if (action === 'select' || action === 'insert') return true;
      return session.role === 'admin'; // Somente admin/rotina pode deletar do bucket gerados
    }

    return false;
  }
}

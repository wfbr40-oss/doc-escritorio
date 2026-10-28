import { UserSessionProfile } from './session';

/**
 * Validador das políticas de Row Level Security (RLS) e permissões de RPC,
 * refletindo exatamente as migrações:
 * - 0000_profiles.sql
 * - 0001_schema.sql
 * - 0002_rls.sql
 * - 0003_storage.sql
 * - 0004_retencao.sql
 * - 0005_rls_correcao.sql
 */
export class RlsSecurityEnforcer {
  /**
   * Verifica permissão de leitura (SELECT) em tabelas do sistema
   */
  static canSelect(table: string, session: UserSessionProfile | null): boolean {
    // 1. Anon (sem sessão autenticada) não lê nenhuma tabela do sistema
    if (!session) return false;

    // 2. Conforme 0005_rls_correcao.sql:
    // "CREATE POLICY "Admin lê audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin());"
    // Apenas admin tem permissão para ler o audit_log! Usuário comum 'user' não lê audit_log.
    if (table === 'audit_log') {
      return session.role === 'admin';
    }

    const readableTables = [
      'kits',
      'documents',
      'clauses',
      'clause_variants',
      'parameters',
      'model_versions',
      'generated_documents',
      'profiles',
    ];

    return readableTables.includes(table);
  }

  /**
   * Verifica permissão de inserção/atualização em clause_variants
   * Restrito exclusivamente ao administrador
   */
  static canWriteClauseVariants(session: UserSessionProfile | null): boolean {
    if (!session) return false;
    return session.role === 'admin';
  }

  /**
   * Verifica permissão de exclusão (DELETE) em generated_documents
   * Usuário comum NUNCA pode deletar registros gerados (histórico congelado)
   */
  static canDeleteGeneratedDocuments(session: UserSessionProfile | null): boolean {
    if (!session) return false;
    return session.role === 'admin';
  }

  /**
   * Verifica permissão de acesso ao Storage privado (molduras e gerados)
   */
  static canAccessStorageBucket(
    bucket: string,
    session: UserSessionProfile | null,
    action: 'select' | 'insert' | 'delete'
  ): boolean {
    // Storage é estritamente privado: anônimo nunca tem acesso direto
    if (!session) return false;

    if (bucket === 'molduras') {
      if (action === 'select') return true;
      return session.role === 'admin';
    }

    if (bucket === 'gerados') {
      if (action === 'select' || action === 'insert') return true;
      return session.role === 'admin'; // Somente admin ou serviço de retenção pode deletar
    }

    return false;
  }

  /**
   * Conforme 0005_rls_correcao.sql:
   * Usuário comum não pode alterar o próprio papel (role) em profiles.
   * O CHECK exige: auth.uid() = id AND role = (SELECT p.role FROM public.profiles WHERE p.id = auth.uid())
   */
  static canUpdateProfileRole(
    session: UserSessionProfile | null,
    targetProfileId: string,
    newRole: string,
    currentRole: string
  ): boolean {
    if (!session) return false;
    // Só pode tentar atualizar o próprio perfil
    if (session.id !== targetProfileId) return false;

    // Se o usuário tentar alterar o papel (role) para outro valor:
    if (newRole !== currentRole) {
      // Bloqueado pelo WITH CHECK da política "Cada usuário atualiza só o próprio perfil"
      return false;
    }

    return true;
  }

  /**
   * Conforme 0005_rls_correcao.sql:
   * "REVOKE EXECUTE ON FUNCTION public.purge_expired_documents(timestamptz) FROM PUBLIC, anon, authenticated;
   *  GRANT  EXECUTE ON FUNCTION public.purge_expired_documents(timestamptz) TO service_role;"
   */
  static canExecuteRpc(
    rpcName: string,
    session: UserSessionProfile | null,
    isServiceRole: boolean = false
  ): boolean {
    if (rpcName === 'purge_expired_documents') {
      // Somente service_role tem permissão de execução
      return isServiceRole;
    }

    if (rpcName === 'is_admin') {
      // Anon não pode executar, apenas authenticated
      return !!session;
    }

    return false;
  }

  /**
   * Conforme 0005_rls_correcao.sql:
   * "CREATE POLICY "Autenticados inserem o próprio audit_log" ON public.audit_log
   *  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());"
   */
  static canInsertAuditLog(
    session: UserSessionProfile | null,
    recordUserId: string
  ): boolean {
    if (!session) return false;
    return session.id === recordUserId;
  }

  /**
   * Conforme 0005_rls_correcao.sql:
   * "CREATE POLICY "Autenticados inserem os próprios generated_documents" ON public.generated_documents
   *  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());"
   */
  static canInsertGeneratedDocuments(
    session: UserSessionProfile | null,
    recordUserId: string
  ): boolean {
    if (!session) return false;
    return session.id === recordUserId;
  }
}

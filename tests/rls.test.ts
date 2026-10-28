import { describe, it, expect } from 'vitest';
import { RlsSecurityEnforcer } from '../src/lib/supabase/rls-simulator';
import { UserSessionProfile } from '../src/lib/supabase/session';

describe('Tarefa 2 (complemento): testes de RLS e migração de correção', () => {
  const userComum: UserSessionProfile = {
    id: 'user-carlos-adv',
    name: 'Dr. Carlos Mendes',
    role: 'user',
    email: 'carlos@escritorio.adv.br',
  };

  const userAdmin: UserSessionProfile = {
    id: 'user-amanda-admin',
    name: 'Dra. Amanda Oliveira',
    role: 'admin',
    email: 'amanda@escritorio.adv.br',
  };

  it('anon não lê nenhuma tabela', () => {
    const tabelas = [
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

    for (const tabela of tabelas) {
      expect(
        RlsSecurityEnforcer.canSelect(tabela, null),
        `anon não deve conseguir ler a tabela ${tabela}`
      ).toBe(false);
    }
  });

  it('user não consegue insert/update em clause_variants', () => {
    // Usuário comum 'user' não tem permissão para alterar modelos nem variantes
    expect(RlsSecurityEnforcer.canWriteClauseVariants(userComum)).toBe(false);
    // Somente admin possui permissão de escrita em clause_variants
    expect(RlsSecurityEnforcer.canWriteClauseVariants(userAdmin)).toBe(true);
  });

  it('user não consegue delete em generated_documents', () => {
    // Histórico congelado: usuário comum não pode excluir documentos gerados
    expect(RlsSecurityEnforcer.canDeleteGeneratedDocuments(userComum)).toBe(false);
    // Apenas administrador ou serviço interno pode efetuar expurgo
    expect(RlsSecurityEnforcer.canDeleteGeneratedDocuments(userAdmin)).toBe(true);
  });

  it('bucket gerados recusa leitura anônima', () => {
    // Bucket gerados é estritamente privado
    expect(RlsSecurityEnforcer.canAccessStorageBucket('gerados', null, 'select')).toBe(false);
    expect(RlsSecurityEnforcer.canAccessStorageBucket('molduras', null, 'select')).toBe(false);

    // Usuário autenticado pode ler gerados (via link temporário ou sistema)
    expect(RlsSecurityEnforcer.canAccessStorageBucket('gerados', userComum, 'select')).toBe(true);
  });

  it('user não consegue alterar o próprio role em profiles', () => {
    // Tentativa do usuário comum de promover a si mesmo para 'admin'
    const conseguiuPromover = RlsSecurityEnforcer.canUpdateProfileRole(
      userComum,
      'user-carlos-adv',
      'admin', // novo papel tentado
      'user'   // papel atual no banco
    );
    expect(conseguiuPromover).toBe(false);

    // Usuário atualizando o próprio perfil mantendo o role inalterado é permitido
    const atualizouNomeMantendoRole = RlsSecurityEnforcer.canUpdateProfileRole(
      userComum,
      'user-carlos-adv',
      'user',
      'user'
    );
    expect(atualizouNomeMantendoRole).toBe(true);

    // Usuário comum não pode atualizar o perfil de outro usuário
    const atualizouOutro = RlsSecurityEnforcer.canUpdateProfileRole(
      userComum,
      'user-amanda-admin',
      'user',
      'admin'
    );
    expect(atualizouOutro).toBe(false);
  });

  it('anon não consegue chamar rpc purge_expired_documents', () => {
    // Anon não consegue executar a função RPC de purga
    expect(RlsSecurityEnforcer.canExecuteRpc('purge_expired_documents', null, false)).toBe(false);

    // Usuário autenticado ('user' ou 'admin') também não pode chamar diretamente via API pública
    expect(RlsSecurityEnforcer.canExecuteRpc('purge_expired_documents', userComum, false)).toBe(false);
    expect(RlsSecurityEnforcer.canExecuteRpc('purge_expired_documents', userAdmin, false)).toBe(false);

    // Somente service_role (rotina interna do servidor/cron) tem permissão de execução
    expect(RlsSecurityEnforcer.canExecuteRpc('purge_expired_documents', null, true)).toBe(true);
  });

  it('user não consegue ler audit_log e não consegue inserir com user_id de outra pessoa', () => {
    // 1. Usuário comum NÃO pode ler a tabela audit_log (restrito a admin pela nova política)
    expect(RlsSecurityEnforcer.canSelect('audit_log', userComum)).toBe(false);
    expect(RlsSecurityEnforcer.canSelect('audit_log', userAdmin)).toBe(true);

    // 2. Usuário comum NÃO pode inserir evento de auditoria com user_id de outra pessoa (spoofing)
    const inseriuComIdDeOutro = RlsSecurityEnforcer.canInsertAuditLog(
      userComum,
      'user-amanda-admin' // ID de outra pessoa
    );
    expect(inseriuComIdDeOutro).toBe(false);

    // 3. Usuário inserindo com seu próprio user_id é permitido
    const inseriuComProprioId = RlsSecurityEnforcer.canInsertAuditLog(
      userComum,
      'user-carlos-adv' // próprio ID
    );
    expect(inseriuComProprioId).toBe(true);

    // 4. Da mesma forma, não consegue inserir generated_documents com user_id de outro usuário
    expect(RlsSecurityEnforcer.canInsertGeneratedDocuments(userComum, 'user-amanda-admin')).toBe(false);
    expect(RlsSecurityEnforcer.canInsertGeneratedDocuments(userComum, 'user-carlos-adv')).toBe(true);
  });
});

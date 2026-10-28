import { describe, it, expect } from 'vitest';
import { RlsSecurityEnforcer } from '../src/lib/supabase/rls-simulator';
import { UserSessionProfile } from '../src/lib/supabase/session';

describe('Políticas de Banco, RLS e Storage Privado (Tarefa 2)', () => {
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
    expect(RlsSecurityEnforcer.canSelect('kits', null)).toBe(false);
    expect(RlsSecurityEnforcer.canSelect('documents', null)).toBe(false);
    expect(RlsSecurityEnforcer.canSelect('clause_variants', null)).toBe(false);
    expect(RlsSecurityEnforcer.canSelect('generated_documents', null)).toBe(false);
    expect(RlsSecurityEnforcer.canSelect('audit_log', null)).toBe(false);
  });

  it('user não consegue insert/update em clause_variants', () => {
    // Usuário comum não pode alterar modelos nem variantes
    expect(RlsSecurityEnforcer.canWriteClauseVariants(userComum)).toBe(false);
    // Administrador pode alterar modelos e variantes
    expect(RlsSecurityEnforcer.canWriteClauseVariants(userAdmin)).toBe(true);
  });

  it('user não consegue delete em generated_documents', () => {
    // Histórico congelado: usuário comum não pode apagar registros gerados
    expect(RlsSecurityEnforcer.canDeleteGeneratedDocuments(userComum)).toBe(false);
    expect(RlsSecurityEnforcer.canDeleteGeneratedDocuments(userAdmin)).toBe(true);
  });

  it('bucket gerados recusa leitura anônima', () => {
    expect(RlsSecurityEnforcer.canAccessStorageBucket('gerados', null, 'select')).toBe(false);
    expect(RlsSecurityEnforcer.canAccessStorageBucket('molduras', null, 'select')).toBe(false);

    // Usuário autenticado pode ler gerados (via sistema)
    expect(RlsSecurityEnforcer.canAccessStorageBucket('gerados', userComum, 'select')).toBe(true);
  });
});

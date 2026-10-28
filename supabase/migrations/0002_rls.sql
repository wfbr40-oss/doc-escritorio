-- 0002_rls.sql
-- Habilitação e políticas de Row Level Security (RLS) para todas as tabelas

-- 1. Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.kits enable row level security;
alter table public.documents enable row level security;
alter table public.clauses enable row level security;
alter table public.clause_variants enable row level security;
alter table public.parameters enable row level security;
alter table public.model_versions enable row level security;
alter table public.clients enable row level security;
alter table public.generated_documents enable row level security;
alter table public.audit_log enable row level security;

-- Helper para verificar se usuário autenticado é admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
-- Usuários autenticados podem ver perfis dos colegas do escritório
create policy "Autenticados leem profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Apenas admin pode criar ou alterar perfis
create policy "Apenas admin altera profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- KITS, DOCUMENTS, CLAUSES, CLAUSE_VARIANTS, PARAMETERS, MODEL_VERSIONS
-- Leitura permitida para qualquer usuário autenticado (user e admin)
create policy "Autenticados leem kits" on public.kits for select to authenticated using (true);
create policy "Autenticados leem documents" on public.documents for select to authenticated using (true);
create policy "Autenticados leem clauses" on public.clauses for select to authenticated using (true);
create policy "Autenticados leem clause_variants" on public.clause_variants for select to authenticated using (true);
create policy "Autenticados leem parameters" on public.parameters for select to authenticated using (true);
create policy "Autenticados leem model_versions" on public.model_versions for select to authenticated using (true);

-- Escrita restrita a admin
create policy "Apenas admin insere/edita kits" on public.kits for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Apenas admin insere/edita documents" on public.documents for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Apenas admin insere/edita clauses" on public.clauses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Apenas admin insere/edita clause_variants" on public.clause_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Apenas admin insere/edita parameters" on public.parameters for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Apenas admin insere/edita model_versions" on public.model_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- GENERATED_DOCUMENTS
-- Leitura compartilhada pelo escritório (conforme Decisão 1: histórico visível a todos os usuários)
create policy "Autenticados leem generated_documents"
  on public.generated_documents for select
  to authenticated
  using (true);

-- Usuários autenticados podem inserir novos documentos gerados
create policy "Autenticados inserem generated_documents"
  on public.generated_documents for insert
  to authenticated
  with check (auth.uid() is not null);

-- Bloqueio de UPDATE e DELETE para usuários comuns:
-- Update só é permitido pelo service role ou admin (ex: rotina de expiração zera snapshot)
create policy "Apenas admin altera generated_documents"
  on public.generated_documents for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Nunca delete por usuário comum
create policy "Apenas admin deleta generated_documents"
  on public.generated_documents for delete
  to authenticated
  using (public.is_admin());

-- AUDIT_LOG
-- Usuários autenticados podem ler logs e inserir eventos de auditoria
create policy "Autenticados leem audit_log"
  on public.audit_log for select
  to authenticated
  using (true);

create policy "Autenticados inserem audit_log"
  on public.audit_log for insert
  to authenticated
  with check (auth.uid() is not null);

-- Ninguém (nem admin) pode alterar ou apagar logs de auditoria
-- (imutabilidade do log)
create policy "Bloqueio total de update no audit_log"
  on public.audit_log for update
  using (false);

create policy "Bloqueio total de delete no audit_log"
  on public.audit_log for delete
  using (false);

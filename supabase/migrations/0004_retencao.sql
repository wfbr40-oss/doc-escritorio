-- 0004_retencao.sql
-- Funções de retenção de 1 ano e expiração automática

-- Procedimento de purga para zerar snapshots e marcar como expirado
create or replace function public.purge_expired_documents(reference_date timestamptz default now())
returns table(id uuid, file_path text)
language plpgsql
security definer
as $$
begin
  return query
  update public.generated_documents
  set
    snapshot = null,
    status = 'expirado'
  where
    status = 'ativo'
    and expires_at <= reference_date
  returning
    public.generated_documents.id,
    public.generated_documents.file_path;
end;
$$;

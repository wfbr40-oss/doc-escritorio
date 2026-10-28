-- 0003_storage.sql
-- Configuração dos buckets de Storage privados (molduras e gerados)

-- Criação dos buckets privados (sem acesso público)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('molduras', 'molduras', false, 15728640, array['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip']),
  ('gerados', 'gerados', false, 52428800, array['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'])
on conflict (id) do update set
  public = false;

-- Políticas para o bucket 'molduras'
-- Usuários autenticados podem ler/baixar as molduras
create policy "Autenticados leem molduras"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'molduras');

-- Apenas admin pode inserir ou atualizar molduras
create policy "Apenas admin envia molduras"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'molduras' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Políticas para o bucket 'gerados'
-- Somente leitura via signed URLs (ou autenticado próprio do sistema)
create policy "Autenticados leem gerados"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'gerados');

-- Usuários autenticados podem gravar novos documentos gerados
create policy "Autenticados salvam documentos gerados"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gerados');

-- Usuário comum NÃO pode deletar arquivos de documentos gerados (apenas rotina de retenção/admin)
create policy "Apenas admin remove documentos gerados do storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'gerados' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

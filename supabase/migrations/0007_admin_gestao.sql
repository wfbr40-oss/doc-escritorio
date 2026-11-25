-- 0007_admin_gestao.sql
-- Colunas e políticas para gestão administrativa de modelos, kits e acesso de usuários

alter table public.profiles
  add column if not exists ativo boolean not null default true,
  add column if not exists allowed_kit_ids text[];

alter table public.documents
  add column if not exists template_content jsonb;

-- Permite que administradores atualizem e removam arquivos no bucket 'molduras'
drop policy if exists "Apenas admin atualiza molduras" on storage.objects;
create policy "Apenas admin atualiza molduras"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'molduras' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    bucket_id = 'molduras' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Apenas admin remove molduras" on storage.objects;
create policy "Apenas admin remove molduras"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'molduras' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

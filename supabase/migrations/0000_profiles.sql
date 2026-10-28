-- 0000_profiles.sql
-- Tabela de perfis com RLS: cada usuário lê apenas o próprio perfil

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Ativa RLS na tabela profiles
alter table public.profiles enable row level security;

-- Política: cada usuário lê apenas o próprio perfil
create policy "Cada usuário lê só o próprio perfil"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Política: usuário pode atualizar o próprio perfil (mantendo o role restrito ou imutável)
create policy "Cada usuário atualiza só o próprio perfil"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger para provisionar perfil automaticamente quando um usuário for criado no Supabase Auth pelo administrador
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

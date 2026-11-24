-- 0006_profiles_email_sessions.sql
-- Adiciona coluna email em public.profiles e cria tabela public.user_sessions para registro de sessões no banco

alter table public.profiles
  add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz
);

alter table public.user_sessions enable row level security;

drop policy if exists "Usuario le proprias sessoes" on public.user_sessions;
create policy "Usuario le proprias sessoes"
  on public.user_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Usuario cria proprias sessoes" on public.user_sessions;
create policy "Usuario cria proprias sessoes"
  on public.user_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Usuario revoga proprias sessoes" on public.user_sessions;
create policy "Usuario revoga proprias sessoes"
  on public.user_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

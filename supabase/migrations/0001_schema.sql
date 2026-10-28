-- 0001_schema.sql
-- Tabelas do sistema Gerador de Documentos Previdenciários

create extension if not exists "uuid-ossp";

-- Perfis dos usuários vinculados ao Supabase Auth
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Kits de documentos (ex: kit_previdenciario)
create table if not exists public.kits (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Documentos pertencentes a um kit (templates gerados ou arquivos estáticos)
create table if not exists public.documents (
  id text primary key,
  kit_id text not null references public.kits(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('template', 'static')),
  template_file_path text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Cláusulas que mudam entre variantes
create table if not exists public.clauses (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  name text not null,
  key text not null,
  created_at timestamptz not null default now()
);

-- Variantes de uma cláusula (ex: padrao, auxilio_acidente_trafego_pago)
create table if not exists public.clause_variants (
  id text primary key,
  clause_id text not null references public.clauses(id) on delete cascade,
  key text not null,
  name text not null,
  text_paragraphs jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Parâmetros e valores numéricos/textuais (ex: minimo_honorarios)
create table if not exists public.parameters (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  key text not null,
  label text not null,
  default_value text not null,
  created_at timestamptz not null default now()
);

-- Versões congeladas e aprovadas pelo advogado
create table if not exists public.model_versions (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  version integer not null default 1,
  snapshot jsonb not null default '{}'::jsonb,
  approved_by text not null,
  created_at timestamptz not null default now()
);

-- Cadastro de clientes (fase 3; tabela reservada sem uso na fase 1)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Histórico de documentos gerados
create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  document_id text not null references public.documents(id),
  user_id uuid references auth.users(id),
  snapshot jsonb,
  file_path text not null,
  status text not null default 'ativo' check (status in ('ativo', 'expirado')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Registro seguro de auditoria (sem PII nem dados de clientes)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  target_id text,
  ip_address text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Índices essenciais para consultas e expiração
create index if not exists idx_generated_documents_batch on public.generated_documents(batch_id);
create index if not exists idx_generated_documents_expires on public.generated_documents(expires_at) where status = 'ativo';
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

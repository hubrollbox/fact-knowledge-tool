-- =============================================================================
-- FKT — Factual Knowledge Tool
-- Complete Database Migration
-- Run this in your Supabase project → SQL Editor
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────

create type public.processo_tipo    as enum ('academico', 'profissional');
create type public.processo_estado  as enum ('em_analise', 'em_progresso', 'concluido', 'arquivado');
create type public.issue_prioridade as enum ('alta', 'media', 'baixa');
create type public.issue_estado     as enum ('aberta', 'resolvida');
create type public.application_tipo as enum ('pro', 'contra');
create type public.grau_certeza     as enum ('alto', 'medio', 'baixo', 'desconhecido');


-- ─────────────────────────────────────────────
-- 2. updated_at TRIGGER FUNCTION
-- ─────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────
-- 3. TABLES
-- ─────────────────────────────────────────────

-- clientes
create table public.clientes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  email      text,
  telefone   text,
  morada     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();


-- processos
create table public.processos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  titulo     text not null,
  tipo       public.processo_tipo not null default 'profissional',
  estado     public.processo_estado not null default 'em_analise',
  materia    text,
  descricao  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger processos_updated_at before update on public.processos
  for each row execute function public.set_updated_at();


-- factos
create table public.factos (
  id          uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos(id) on delete cascade,
  descricao   text not null,
  data_facto  date,
  grau_certeza public.grau_certeza not null default 'desconhecido',
  observacoes text,
  documento_id uuid, -- populated after documentos table created (FK added below)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger factos_updated_at before update on public.factos
  for each row execute function public.set_updated_at();


-- issues
create table public.issues (
  id          uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos(id) on delete cascade,
  descricao   text not null,
  prioridade  public.issue_prioridade not null default 'media',
  estado      public.issue_estado not null default 'aberta',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger issues_updated_at before update on public.issues
  for each row execute function public.set_updated_at();


-- rules
create table public.rules (
  id              uuid primary key default gen_random_uuid(),
  processo_id     uuid not null references public.processos(id) on delete cascade,
  referencia      text not null,
  texto           text not null,
  vigencia_inicio date,
  vigencia_fim    date,
  fonte           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger rules_updated_at before update on public.rules
  for each row execute function public.set_updated_at();


-- applications
create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos(id) on delete cascade,
  issue_id    uuid not null references public.issues(id) on delete cascade,
  rule_id     uuid not null references public.rules(id) on delete cascade,
  argumento   text not null,
  tipo        public.application_tipo not null default 'pro',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();


-- application_factos (many-to-many: applications <-> factos)
create table public.application_factos (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  facto_id       uuid not null references public.factos(id) on delete cascade,
  unique(application_id, facto_id)
);


-- conclusoes (one per issue, enforced by unique constraint)
create table public.conclusoes (
  id             uuid primary key default gen_random_uuid(),
  issue_id       uuid not null references public.issues(id) on delete cascade,
  resultado      text not null,
  grau_confianca public.grau_certeza not null default 'medio',
  pontos_frageis text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(issue_id)  -- one conclusion per issue
);

create trigger conclusoes_updated_at before update on public.conclusoes
  for each row execute function public.set_updated_at();


-- documentos
create table public.documentos (
  id              uuid primary key default gen_random_uuid(),
  processo_id     uuid not null references public.processos(id) on delete cascade,
  titulo          text not null,
  tipo            text,
  data_documento  date,
  entidade_origem text,
  localizacao     text,
  descricao       text,
  storage_path    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger documentos_updated_at before update on public.documentos
  for each row execute function public.set_updated_at();

-- Add FK from factos to documentos (now that table exists)
alter table public.factos
  add constraint factos_documento_id_fkey
  foreign key (documento_id) references public.documentos(id) on delete set null;


-- disciplinas
create table public.disciplinas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  descricao     text,
  docente       text,
  docente_telm  text,
  docente_email text,
  regente       text,
  regente_telm  text,
  regente_email text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger disciplinas_updated_at before update on public.disciplinas
  for each row execute function public.set_updated_at();


-- topicos
create table public.topicos (
  id            uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  nome          text not null,
  conteudo      text,
  referencias   text,
  video_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger topicos_updated_at before update on public.topicos
  for each row execute function public.set_updated_at();


-- disciplina_processos (many-to-many: disciplinas <-> processos)
create table public.disciplina_processos (
  id            uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  processo_id   uuid not null references public.processos(id) on delete cascade,
  unique(disciplina_id, processo_id)
);


-- quizzes (for DisciplinaDetalhe)
create table public.quizzes (
  id              uuid primary key default gen_random_uuid(),
  disciplina_id   uuid not null references public.disciplinas(id) on delete cascade,
  topico_id       uuid references public.topicos(id) on delete cascade,
  pergunta        text not null,
  opcoes          jsonb not null default '[]',
  resposta_correta integer not null default 0,
  created_at      timestamptz not null default now()
);


-- discussoes
create table public.discussoes (
  id            uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  topico_id     uuid references public.topicos(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  comentario    text not null,
  created_at    timestamptz not null default now()
);


-- progressos (tracks topic completion per user)
create table public.progressos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  topico_id     uuid not null references public.topicos(id) on delete cascade,
  completado    boolean not null default false,
  unique(user_id, topico_id)
);


-- ─────────────────────────────────────────────
-- 4. BUSINESS RULE TRIGGER
--    Process can only be 'concluido' if all
--    issues are resolved and have a conclusao.
-- ─────────────────────────────────────────────

create or replace function public.validate_processo_conclusao()
returns trigger language plpgsql as $$
declare
  open_issues integer;
  issues_without_conclusao integer;
begin
  if new.estado = 'concluido' and (old.estado is null or old.estado <> 'concluido') then
    select count(*) into open_issues
    from public.issues
    where processo_id = new.id and estado = 'aberta';

    if open_issues > 0 then
      raise exception 'Não é possível concluir o processo: existem % issue(s) ainda abertas.', open_issues;
    end if;

    select count(*) into issues_without_conclusao
    from public.issues i
    left join public.conclusoes c on c.issue_id = i.id
    where i.processo_id = new.id and c.id is null;

    if issues_without_conclusao > 0 then
      raise exception 'Não é possível concluir o processo: % issue(s) não têm conclusão.', issues_without_conclusao;
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_processo_conclusao_trigger
  before update on public.processos
  for each row execute function public.validate_processo_conclusao();


-- RLS and authorization policies are established by the subsequent
-- 20260301165200 migration. Storage is configured by 20260301165039.

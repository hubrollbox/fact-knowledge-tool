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


-- ─────────────────────────────────────────────
-- 5. HELPER: get processo user_id
--    (used in RLS on child tables to avoid
--     cross-table recursive policies)
-- ─────────────────────────────────────────────

create or replace function public.get_processo_user_id(_processo_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.processos where id = _processo_id;
$$;

create or replace function public.get_disciplina_user_id(_disciplina_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.disciplinas where id = _disciplina_id;
$$;

create or replace function public.get_issue_processo_user_id(_issue_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.user_id from public.issues i
  join public.processos p on p.id = i.processo_id
  where i.id = _issue_id;
$$;

create or replace function public.get_application_processo_user_id(_application_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.user_id from public.applications a
  join public.processos p on p.id = a.processo_id
  where a.id = _application_id;
$$;


-- ─────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

-- clientes
alter table public.clientes enable row level security;
create policy "Users manage own clientes" on public.clientes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- processos
alter table public.processos enable row level security;
create policy "Users manage own processos" on public.processos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- factos
alter table public.factos enable row level security;
create policy "Users manage own factos" on public.factos
  for all to authenticated
  using (public.get_processo_user_id(processo_id) = auth.uid())
  with check (public.get_processo_user_id(processo_id) = auth.uid());

-- issues
alter table public.issues enable row level security;
create policy "Users manage own issues" on public.issues
  for all to authenticated
  using (public.get_processo_user_id(processo_id) = auth.uid())
  with check (public.get_processo_user_id(processo_id) = auth.uid());

-- rules
alter table public.rules enable row level security;
create policy "Users manage own rules" on public.rules
  for all to authenticated
  using (public.get_processo_user_id(processo_id) = auth.uid())
  with check (public.get_processo_user_id(processo_id) = auth.uid());

-- applications
alter table public.applications enable row level security;
create policy "Users manage own applications" on public.applications
  for all to authenticated
  using (public.get_processo_user_id(processo_id) = auth.uid())
  with check (public.get_processo_user_id(processo_id) = auth.uid());

-- application_factos
alter table public.application_factos enable row level security;
create policy "Users manage own application_factos" on public.application_factos
  for all to authenticated
  using (public.get_application_processo_user_id(application_id) = auth.uid())
  with check (public.get_application_processo_user_id(application_id) = auth.uid());

-- conclusoes
alter table public.conclusoes enable row level security;
create policy "Users manage own conclusoes" on public.conclusoes
  for all to authenticated
  using (public.get_issue_processo_user_id(issue_id) = auth.uid())
  with check (public.get_issue_processo_user_id(issue_id) = auth.uid());

-- documentos
alter table public.documentos enable row level security;
create policy "Users manage own documentos" on public.documentos
  for all to authenticated
  using (public.get_processo_user_id(processo_id) = auth.uid())
  with check (public.get_processo_user_id(processo_id) = auth.uid());

-- disciplinas
alter table public.disciplinas enable row level security;
create policy "Users manage own disciplinas" on public.disciplinas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- topicos
alter table public.topicos enable row level security;
create policy "Users manage own topicos" on public.topicos
  for all to authenticated
  using (public.get_disciplina_user_id(disciplina_id) = auth.uid())
  with check (public.get_disciplina_user_id(disciplina_id) = auth.uid());

-- disciplina_processos
alter table public.disciplina_processos enable row level security;
create policy "Users manage own disciplina_processos" on public.disciplina_processos
  for all to authenticated
  using (public.get_disciplina_user_id(disciplina_id) = auth.uid())
  with check (public.get_disciplina_user_id(disciplina_id) = auth.uid());

-- quizzes
alter table public.quizzes enable row level security;
create policy "Users manage own quizzes" on public.quizzes
  for all to authenticated
  using (public.get_disciplina_user_id(disciplina_id) = auth.uid())
  with check (public.get_disciplina_user_id(disciplina_id) = auth.uid());

-- discussoes
alter table public.discussoes enable row level security;
create policy "Users manage own discussoes" on public.discussoes
  for all to authenticated
  using (public.get_disciplina_user_id(disciplina_id) = auth.uid())
  with check (public.get_disciplina_user_id(disciplina_id) = auth.uid());

-- progressos
alter table public.progressos enable row level security;
create policy "Users manage own progressos" on public.progressos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ─────────────────────────────────────────────
-- 7. STORAGE BUCKET for document uploads
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  52428800, -- 50 MB
  array['application/pdf','image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Users can upload files only into their own folder (user_id/...)
create policy "Authenticated users upload own documents" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own documents" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─────────────────────────────────────────────
-- DONE ✓
-- ─────────────────────────────────────────────

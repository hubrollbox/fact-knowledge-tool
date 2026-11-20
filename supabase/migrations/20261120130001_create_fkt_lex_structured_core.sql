-- FKT Lex: relational legal-analysis core.
-- Every record is scoped to one process and one workspace.
-- Facts, legal issues, sources, application and conclusions remain separate.

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.juridico_processos'::regclass
      AND conname = 'juridico_processos_id_workspace_unique'
  ) THEN
    ALTER TABLE public.juridico_processos
      ADD CONSTRAINT juridico_processos_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
END $block$;

ALTER TABLE public.juridico_documentos
  ADD CONSTRAINT juridico_documentos_id_process_workspace_unique UNIQUE (id, processo_id, workspace_id);

CREATE TABLE public.juridico_factos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  descricao text NOT NULL,
  estado text NOT NULL DEFAULT 'por_confirmar'
    CHECK (estado IN ('por_confirmar','confirmado','contestado','nao_provado')),
  data_facto date,
  origem text,
  notas text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT juridico_factos_process_fk
    FOREIGN KEY (processo_id, workspace_id)
    REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT juridico_factos_id_process_workspace_unique UNIQUE (id, processo_id, workspace_id)
);

CREATE TABLE public.juridico_questoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  titulo text NOT NULL,
  pergunta text NOT NULL,
  estado text NOT NULL DEFAULT 'aberta'
    CHECK (estado IN ('aberta','em_analise','respondida','arquivada')),
  ordem integer NOT NULL DEFAULT 0,
  notas text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT juridico_questoes_process_fk
    FOREIGN KEY (processo_id, workspace_id)
    REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT juridico_questoes_id_process_workspace_unique UNIQUE (id, processo_id, workspace_id)
);

CREATE TABLE public.juridico_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('legislacao','jurisprudencia','doutrina','outro')),
  titulo text NOT NULL,
  entidade text,
  referencia text,
  jurisdicao text DEFAULT 'Portugal',
  url_origem text,
  data_fonte date,
  versao text,
  notas text,
  documento_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT juridico_fontes_process_fk
    FOREIGN KEY (processo_id, workspace_id)
    REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT juridico_fontes_id_process_workspace_unique UNIQUE (id, processo_id, workspace_id),
  CONSTRAINT juridico_fontes_document_fk
    FOREIGN KEY (documento_id, processo_id, workspace_id)
    REFERENCES public.juridico_documentos(id, processo_id, workspace_id) ON DELETE RESTRICT
);

CREATE TABLE public.juridico_factos_documentos (
  workspace_id uuid NOT NULL,
  processo_id uuid NOT NULL,
  facto_id uuid NOT NULL,
  documento_id uuid NOT NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (facto_id, documento_id),
  FOREIGN KEY (facto_id, processo_id, workspace_id)
    REFERENCES public.juridico_factos(id, processo_id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (documento_id, processo_id, workspace_id)
    REFERENCES public.juridico_documentos(id, processo_id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE public.juridico_questoes_factos (
  workspace_id uuid NOT NULL,
  processo_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  facto_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (questao_id, facto_id),
  FOREIGN KEY (questao_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes(id, processo_id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (facto_id, processo_id, workspace_id)
    REFERENCES public.juridico_factos(id, processo_id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE public.juridico_questoes_fontes (
  workspace_id uuid NOT NULL,
  processo_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  fonte_id uuid NOT NULL,
  segmento_aplicavel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (questao_id, fonte_id),
  FOREIGN KEY (questao_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes(id, processo_id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (fonte_id, processo_id, workspace_id)
    REFERENCES public.juridico_fontes(id, processo_id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE public.juridico_aplicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  raciocinio text NOT NULL,
  argumentos_favoraveis text,
  argumentos_contrarios text,
  lacunas text,
  estado text NOT NULL DEFAULT 'rascunho'
    CHECK (estado IN ('rascunho','revista','final')),
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (processo_id, workspace_id)
    REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (questao_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes(id, processo_id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT juridico_aplicacoes_id_process_workspace_unique UNIQUE (id, processo_id, workspace_id),
  CONSTRAINT juridico_aplicacoes_id_process_workspace_issue_unique UNIQUE (id, processo_id, workspace_id, questao_id)
);

ALTER TABLE public.juridico_aplicacoes
  ADD COLUMN pressupostos text;

-- Link the reasoning application to the exact facts and sources considered.
ALTER TABLE public.juridico_questoes_factos
  ADD CONSTRAINT juridico_questoes_factos_scope_unique
  UNIQUE (questao_id, facto_id, processo_id, workspace_id);
ALTER TABLE public.juridico_questoes_fontes
  ADD CONSTRAINT juridico_questoes_fontes_scope_unique
  UNIQUE (questao_id, fonte_id, processo_id, workspace_id);

CREATE TABLE public.juridico_aplicacoes_factos (
  workspace_id uuid NOT NULL,
  processo_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  aplicacao_id uuid NOT NULL,
  facto_id uuid NOT NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aplicacao_id, facto_id),
  FOREIGN KEY (aplicacao_id, processo_id, workspace_id, questao_id)
    REFERENCES public.juridico_aplicacoes(id, processo_id, workspace_id, questao_id) ON DELETE CASCADE,
  FOREIGN KEY (facto_id, processo_id, workspace_id)
    REFERENCES public.juridico_factos(id, processo_id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (questao_id, facto_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes_factos(questao_id, facto_id, processo_id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE public.juridico_aplicacoes_fontes (
  workspace_id uuid NOT NULL,
  processo_id uuid NOT NULL,
  questao_id uuid NOT NULL,
  aplicacao_id uuid NOT NULL,
  fonte_id uuid NOT NULL,
  segmento_aplicavel text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aplicacao_id, fonte_id),
  FOREIGN KEY (aplicacao_id, processo_id, workspace_id, questao_id)
    REFERENCES public.juridico_aplicacoes(id, processo_id, workspace_id, questao_id) ON DELETE CASCADE,
  FOREIGN KEY (fonte_id, processo_id, workspace_id)
    REFERENCES public.juridico_fontes(id, processo_id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (questao_id, fonte_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes_fontes(questao_id, fonte_id, processo_id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE public.juridico_conclusoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  questao_id uuid,
  aplicacao_id uuid,
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  texto text NOT NULL,
  estado text NOT NULL DEFAULT 'rascunho'
    CHECK (estado IN ('rascunho','revista','final')),
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (processo_id, workspace_id)
    REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (questao_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes(id, processo_id, workspace_id) ON DELETE CASCADE,
  CHECK (aplicacao_id IS NULL OR questao_id IS NOT NULL),
  FOREIGN KEY (aplicacao_id, processo_id, workspace_id, questao_id)
    REFERENCES public.juridico_aplicacoes(id, processo_id, workspace_id, questao_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX juridico_conclusoes_issue_version_unique
  ON public.juridico_conclusoes(processo_id, questao_id, versao)
  WHERE questao_id IS NOT NULL;
CREATE UNIQUE INDEX juridico_conclusoes_process_version_unique
  ON public.juridico_conclusoes(processo_id, versao)
  WHERE questao_id IS NULL;

CREATE INDEX juridico_factos_process_idx ON public.juridico_factos(workspace_id, processo_id, created_at DESC);
CREATE INDEX juridico_questoes_process_idx ON public.juridico_questoes(workspace_id, processo_id, ordem);
CREATE INDEX juridico_fontes_process_idx ON public.juridico_fontes(workspace_id, processo_id, tipo);
CREATE INDEX juridico_aplicacoes_issue_idx ON public.juridico_aplicacoes(workspace_id, questao_id, created_at DESC);
CREATE INDEX juridico_aplicacoes_factos_fact_idx ON public.juridico_aplicacoes_factos(facto_id);
CREATE INDEX juridico_aplicacoes_factos_scope_idx ON public.juridico_aplicacoes_factos(aplicacao_id, processo_id, workspace_id, questao_id);
CREATE INDEX juridico_aplicacoes_fontes_fonte_idx ON public.juridico_aplicacoes_fontes(fonte_id);
CREATE INDEX juridico_aplicacoes_fontes_scope_idx ON public.juridico_aplicacoes_fontes(aplicacao_id, processo_id, workspace_id, questao_id);
CREATE INDEX juridico_conclusoes_issue_idx ON public.juridico_conclusoes(workspace_id, questao_id, versao DESC);
CREATE INDEX juridico_factos_documentos_document_idx ON public.juridico_factos_documentos(documento_id);
CREATE INDEX juridico_questoes_factos_fact_idx ON public.juridico_questoes_factos(facto_id);
CREATE INDEX juridico_questoes_fontes_fonte_idx ON public.juridico_questoes_fontes(fonte_id);

-- Harden existing legal tables and apply the same workspace permissions to all new tables.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'juridico_processos','juridico_partes','juridico_documentos','juridico_prazos',
    'juridico_factos','juridico_questoes','juridico_fontes',
    'juridico_factos_documentos','juridico_questoes_factos','juridico_questoes_fontes',
    'juridico_aplicacoes','juridico_aplicacoes_factos','juridico_aplicacoes_fontes','juridico_conclusoes'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.workspace_can_read(workspace_id, (select auth.uid())))',
      t || '_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.workspace_can_write(workspace_id, (select auth.uid())))',
      t || '_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.workspace_can_write(workspace_id, (select auth.uid()))) WITH CHECK (public.workspace_can_write(workspace_id, (select auth.uid())))',
      t || '_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.workspace_can_write(workspace_id, (select auth.uid())))',
      t || '_delete', t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

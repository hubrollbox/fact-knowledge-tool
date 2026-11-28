-- FKT Lex #68 — freeze the analytical context attached to each conclusion version.
-- Snapshots are created by the database when a conclusion version is inserted.
-- No production database is changed by committing this migration.

CREATE TABLE public.juridico_conclusoes_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conclusao_id uuid NOT NULL UNIQUE
    REFERENCES public.juridico_conclusoes(id) ON DELETE RESTRICT,
  processo_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  questao_id uuid,
  aplicacao_id uuid,
  factos_questao jsonb NOT NULL DEFAULT '[]'::jsonb,
  fontes_questao jsonb NOT NULL DEFAULT '[]'::jsonb,
  factos_aplicacao jsonb NOT NULL DEFAULT '[]'::jsonb,
  fontes_aplicacao jsonb NOT NULL DEFAULT '[]'::jsonb,
  aplicacao jsonb,
  captured_by uuid,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT juridico_conclusoes_snapshots_process_fk
    FOREIGN KEY (processo_id, workspace_id)
    REFERENCES public.juridico_processos(id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT juridico_conclusoes_snapshots_conclusao_scope_fk
    FOREIGN KEY (conclusao_id, processo_id, workspace_id)
    REFERENCES public.juridico_conclusoes(id, processo_id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT juridico_conclusoes_snapshots_questao_scope_fk
    FOREIGN KEY (questao_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes(id, processo_id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT juridico_conclusoes_snapshots_aplicacao_scope_fk
    FOREIGN KEY (aplicacao_id, processo_id, workspace_id, questao_id)
    REFERENCES public.juridico_aplicacoes(id, processo_id, workspace_id, questao_id) ON DELETE RESTRICT,
  CHECK (jsonb_typeof(factos_questao) = 'array'),
  CHECK (jsonb_typeof(fontes_questao) = 'array'),
  CHECK (jsonb_typeof(factos_aplicacao) = 'array'),
  CHECK (jsonb_typeof(fontes_aplicacao) = 'array')
);

CREATE INDEX juridico_conclusoes_snapshots_process_idx
  ON public.juridico_conclusoes_snapshots(workspace_id, processo_id, captured_at DESC);

ALTER TABLE public.juridico_conclusoes_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY juridico_conclusoes_snapshots_select
  ON public.juridico_conclusoes_snapshots
  FOR SELECT TO authenticated
  USING (public.workspace_can_read(workspace_id, (select auth.uid())));

REVOKE ALL ON TABLE public.juridico_conclusoes_snapshots FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.juridico_conclusoes_snapshots TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_juridico_conclusao_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'O contexto de uma versão de conclusão é imutável.'
    USING ERRCODE = '55000';
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_juridico_conclusao_snapshot_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER juridico_conclusoes_snapshots_immutable
  BEFORE UPDATE OR DELETE ON public.juridico_conclusoes_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_juridico_conclusao_snapshot_mutation();
ALTER TABLE public.juridico_conclusoes_snapshots
  ENABLE ALWAYS TRIGGER juridico_conclusoes_snapshots_immutable;

CREATE TRIGGER juridico_conclusoes_snapshots_no_truncate
  BEFORE TRUNCATE ON public.juridico_conclusoes_snapshots
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_juridico_conclusao_snapshot_mutation();
ALTER TABLE public.juridico_conclusoes_snapshots
  ENABLE ALWAYS TRIGGER juridico_conclusoes_snapshots_no_truncate;

CREATE OR REPLACE FUNCTION public.capture_juridico_conclusao_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _factos_questao jsonb;
  _fontes_questao jsonb;
  _factos_aplicacao jsonb;
  _fontes_aplicacao jsonb;
  _aplicacao jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'facto_id', f.id,
      'descricao', f.descricao,
      'estado', f.estado,
      'data_facto', f.data_facto,
      'origem', f.origem,
      'notas', f.notas,
      'ligacao_notas', qf.notas
    ) ORDER BY f.created_at, f.id
  ), '[]'::jsonb)
  INTO _factos_questao
  FROM public.juridico_questoes_factos qf
  JOIN public.juridico_factos f
    ON f.id = qf.facto_id AND f.processo_id = qf.processo_id
   AND f.workspace_id = qf.workspace_id
  WHERE qf.questao_id = NEW.questao_id
    AND qf.processo_id = NEW.processo_id
    AND qf.workspace_id = NEW.workspace_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'fonte_id', f.id,
      'tipo', f.tipo,
      'titulo', f.titulo,
      'entidade', f.entidade,
      'referencia', f.referencia,
      'jurisdicao', f.jurisdicao,
      'url_origem', f.url_origem,
      'data_fonte', f.data_fonte,
      'versao', f.versao,
      'notas', f.notas,
      'segmento_aplicavel', qf.segmento_aplicavel
    ) ORDER BY f.created_at, f.id
  ), '[]'::jsonb)
  INTO _fontes_questao
  FROM public.juridico_questoes_fontes qf
  JOIN public.juridico_fontes f
    ON f.id = qf.fonte_id AND f.processo_id = qf.processo_id
   AND f.workspace_id = qf.workspace_id
  WHERE qf.questao_id = NEW.questao_id
    AND qf.processo_id = NEW.processo_id
    AND qf.workspace_id = NEW.workspace_id;

  IF NEW.aplicacao_id IS NOT NULL THEN
    SELECT to_jsonb(a) - 'workspace_id' - 'processo_id'
      INTO _aplicacao
      FROM public.juridico_aplicacoes a
     WHERE a.id = NEW.aplicacao_id
       AND a.processo_id = NEW.processo_id
       AND a.workspace_id = NEW.workspace_id;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'facto_id', f.id,
        'descricao', f.descricao,
        'estado', f.estado,
        'data_facto', f.data_facto,
        'origem', f.origem,
        'notas', f.notas,
        'ligacao_notas', af.notas
      ) ORDER BY f.created_at, f.id
    ), '[]'::jsonb)
    INTO _factos_aplicacao
    FROM public.juridico_aplicacoes_factos af
    JOIN public.juridico_factos f
      ON f.id = af.facto_id AND f.processo_id = af.processo_id
     AND f.workspace_id = af.workspace_id
    WHERE af.aplicacao_id = NEW.aplicacao_id
      AND af.processo_id = NEW.processo_id
      AND af.workspace_id = NEW.workspace_id;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'fonte_id', f.id,
        'tipo', f.tipo,
        'titulo', f.titulo,
        'entidade', f.entidade,
        'referencia', f.referencia,
        'jurisdicao', f.jurisdicao,
        'url_origem', f.url_origem,
        'data_fonte', f.data_fonte,
        'versao', f.versao,
        'notas', f.notas,
        'segmento_aplicavel', af.segmento_aplicavel,
        'ligacao_notas', af.notas
      ) ORDER BY f.created_at, f.id
    ), '[]'::jsonb)
    INTO _fontes_aplicacao
    FROM public.juridico_aplicacoes_fontes af
    JOIN public.juridico_fontes f
      ON f.id = af.fonte_id AND f.processo_id = af.processo_id
     AND f.workspace_id = af.workspace_id
    WHERE af.aplicacao_id = NEW.aplicacao_id
      AND af.processo_id = NEW.processo_id
      AND af.workspace_id = NEW.workspace_id;
  ELSE
    _factos_aplicacao := '[]'::jsonb;
    _fontes_aplicacao := '[]'::jsonb;
  END IF;

  INSERT INTO public.juridico_conclusoes_snapshots (
    conclusao_id, processo_id, workspace_id, questao_id, aplicacao_id,
    factos_questao, fontes_questao, factos_aplicacao, fontes_aplicacao,
    aplicacao, captured_by
  ) VALUES (
    NEW.id, NEW.processo_id, NEW.workspace_id, NEW.questao_id, NEW.aplicacao_id,
    COALESCE(_factos_questao, '[]'::jsonb),
    COALESCE(_fontes_questao, '[]'::jsonb),
    COALESCE(_factos_aplicacao, '[]'::jsonb),
    COALESCE(_fontes_aplicacao, '[]'::jsonb),
    _aplicacao,
    COALESCE(auth.uid(), NEW.autor_id)
  );

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_juridico_conclusao_context()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER juridico_conclusoes_capture_context
  AFTER INSERT ON public.juridico_conclusoes
  FOR EACH ROW EXECUTE FUNCTION public.capture_juridico_conclusao_context();

-- Existing versions are not reconstructed: their historical context cannot be
-- proven from current mutable links. New versions receive snapshots automatically.

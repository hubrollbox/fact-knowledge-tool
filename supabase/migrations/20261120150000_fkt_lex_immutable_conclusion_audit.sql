-- FKT Lex #68 — make conclusion versions immutable and record review lifecycle events.
-- The current UI remains unchanged in this phase; lifecycle presentation is handled separately.

-- A conclusion is evidence: parent deletion must not cascade through it.
ALTER TABLE public.juridico_conclusoes
  DROP CONSTRAINT juridico_conclusoes_processo_id_workspace_id_fkey,
  ADD CONSTRAINT juridico_conclusoes_processo_id_workspace_id_fkey
    FOREIGN KEY (processo_id, workspace_id)
    REFERENCES public.juridico_processos(id, workspace_id) ON DELETE RESTRICT;

ALTER TABLE public.juridico_conclusoes
  DROP CONSTRAINT juridico_conclusoes_questao_id_processo_id_workspace_id_fkey,
  ADD CONSTRAINT juridico_conclusoes_questao_id_processo_id_workspace_id_fkey
    FOREIGN KEY (questao_id, processo_id, workspace_id)
    REFERENCES public.juridico_questoes(id, processo_id, workspace_id) ON DELETE RESTRICT;

-- Keep the author identifier as a historical value even if an auth account is deleted.
ALTER TABLE public.juridico_conclusoes
  DROP CONSTRAINT IF EXISTS juridico_conclusoes_autor_id_fkey;

CREATE TABLE public.juridico_conclusoes_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conclusao_id uuid NOT NULL
    REFERENCES public.juridico_conclusoes(id) ON DELETE RESTRICT,
  processo_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  evento text NOT NULL CHECK (evento IN (
    'criada', 'submetida_revisao', 'devolvida', 'aprovada', 'reaberta'
  )),
  estado_anterior text CHECK (estado_anterior IS NULL OR estado_anterior IN ('rascunho','em_revisao','final')),
  estado_novo text NOT NULL CHECK (estado_novo IN ('rascunho','em_revisao','final')),
  actor_id uuid NOT NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX juridico_conclusoes_eventos_history_idx
  ON public.juridico_conclusoes_eventos(conclusao_id, created_at, id);

ALTER TABLE public.juridico_conclusoes_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY juridico_conclusoes_eventos_select
  ON public.juridico_conclusoes_eventos
  FOR SELECT TO authenticated
  USING (public.workspace_can_read(workspace_id, (select auth.uid())));

REVOKE ALL ON public.juridico_conclusoes_eventos FROM PUBLIC, anon;
GRANT SELECT ON public.juridico_conclusoes_eventos TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_juridico_conclusao_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Registos de conclusões e de auditoria são imutáveis; crie uma nova versão ou registe uma transição.'
    USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION public.record_juridico_conclusao_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.juridico_conclusoes_eventos (
    conclusao_id, processo_id, workspace_id, evento,
    estado_anterior, estado_novo, actor_id
  )
  VALUES (
    NEW.id, NEW.processo_id, NEW.workspace_id, 'criada',
    NULL,
    CASE WHEN NEW.estado = 'revista' THEN 'em_revisao'
         WHEN NEW.estado = 'final' THEN 'final'
         ELSE 'rascunho' END,
    COALESCE(auth.uid(), NEW.autor_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER juridico_conclusoes_immutable
  BEFORE UPDATE OR DELETE ON public.juridico_conclusoes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_juridico_conclusao_mutation();
ALTER TABLE public.juridico_conclusoes
  ENABLE ALWAYS TRIGGER juridico_conclusoes_immutable;

CREATE TRIGGER juridico_conclusoes_no_truncate
  BEFORE TRUNCATE ON public.juridico_conclusoes
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_juridico_conclusao_mutation();
ALTER TABLE public.juridico_conclusoes
  ENABLE ALWAYS TRIGGER juridico_conclusoes_no_truncate;

CREATE TRIGGER juridico_conclusoes_created_event
  AFTER INSERT ON public.juridico_conclusoes
  FOR EACH ROW EXECUTE FUNCTION public.record_juridico_conclusao_creation();

CREATE TRIGGER juridico_conclusoes_eventos_immutable
  BEFORE UPDATE OR DELETE ON public.juridico_conclusoes_eventos
  FOR EACH ROW EXECUTE FUNCTION public.prevent_juridico_conclusao_mutation();
ALTER TABLE public.juridico_conclusoes_eventos
  ENABLE ALWAYS TRIGGER juridico_conclusoes_eventos_immutable;

CREATE TRIGGER juridico_conclusoes_eventos_no_truncate
  BEFORE TRUNCATE ON public.juridico_conclusoes_eventos
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_juridico_conclusao_mutation();
ALTER TABLE public.juridico_conclusoes_eventos
  ENABLE ALWAYS TRIGGER juridico_conclusoes_eventos_no_truncate;

-- Lifecycle is event-sourced: no UPDATE is ever performed on the conclusion row.
CREATE OR REPLACE FUNCTION public.transition_juridico_conclusao(
  _conclusao_id uuid,
  _novo_estado text,
  _notas text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _processo_id uuid;
  _workspace_id uuid;
  _estado_actual text;
  _evento text;
  _event_id uuid;
  _actor uuid := auth.uid();
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501';
  END IF;

  SELECT c.processo_id, c.workspace_id
    INTO _processo_id, _workspace_id
    FROM public.juridico_conclusoes c
   WHERE c.id = _conclusao_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conclusão não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.workspace_can_write(_workspace_id, _actor) THEN
    RAISE EXCEPTION 'Sem permissões para rever esta conclusão' USING ERRCODE = '42501';
  END IF;

  SELECT e.estado_novo
    INTO _estado_actual
    FROM public.juridico_conclusoes_eventos e
   WHERE e.conclusao_id = _conclusao_id
   ORDER BY e.created_at DESC, e.id DESC
   LIMIT 1;

  IF _estado_actual IS NULL THEN
    RAISE EXCEPTION 'Histórico da conclusão indisponível' USING ERRCODE = '55000';
  END IF;

  IF _estado_actual = 'rascunho' AND _novo_estado = 'em_revisao' THEN
    _evento := 'submetida_revisao';
  ELSIF _estado_actual = 'em_revisao' AND _novo_estado = 'rascunho' THEN
    _evento := 'devolvida';
  ELSIF _estado_actual = 'em_revisao' AND _novo_estado = 'final' THEN
    _evento := 'aprovada';
  ELSIF _estado_actual = 'final' AND _novo_estado = 'rascunho' THEN
    _evento := 'reaberta';
  ELSE
    RAISE EXCEPTION 'Transição de estado não permitida: % -> %', _estado_actual, _novo_estado
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.juridico_conclusoes_eventos (
    conclusao_id, processo_id, workspace_id, evento,
    estado_anterior, estado_novo, actor_id, notas
  )
  VALUES (
    _conclusao_id, _processo_id, _workspace_id, _evento,
    _estado_actual, _novo_estado, _actor, NULLIF(btrim(_notas), '')
  )
  RETURNING id INTO _event_id;

  RETURN _event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_juridico_conclusao(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_juridico_conclusao(uuid, text, text) TO authenticated;

-- Remove mutation paths from the Data API. INSERT remains available to the version-creation RPC.
DROP POLICY IF EXISTS juridico_conclusoes_update ON public.juridico_conclusoes;
DROP POLICY IF EXISTS juridico_conclusoes_delete ON public.juridico_conclusoes;

REVOKE ALL ON public.juridico_conclusoes FROM PUBLIC, anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.juridico_conclusoes FROM authenticated, service_role;
GRANT SELECT, INSERT ON public.juridico_conclusoes TO authenticated;
GRANT SELECT, INSERT ON public.juridico_conclusoes TO service_role;

-- A new version must begin as a draft; review/approval is recorded only by lifecycle events.
CREATE OR REPLACE FUNCTION public.create_juridico_conclusao_version(
  _processo_id uuid,
  _workspace_id uuid,
  _questao_id uuid DEFAULT NULL,
  _aplicacao_id uuid DEFAULT NULL,
  _texto text DEFAULT NULL,
  _estado text DEFAULT 'rascunho'
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  _next_version integer;
  _conclusao_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501';
  END IF;

  IF NOT public.workspace_can_write(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissões para criar conclusões neste workspace' USING ERRCODE = '42501';
  END IF;

  IF _texto IS NULL OR btrim(_texto) = '' THEN
    RAISE EXCEPTION 'O texto da conclusão é obrigatório' USING ERRCODE = '22023';
  END IF;

  IF _estado IS DISTINCT FROM 'rascunho' THEN
    RAISE EXCEPTION 'Uma nova versão tem de começar em rascunho; use o fluxo de revisão para a aprovar.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      _processo_id::text || ':' || COALESCE(_questao_id::text, 'processo'),
      0
    )
  );

  SELECT COALESCE(MAX(versao), 0) + 1
    INTO _next_version
    FROM public.juridico_conclusoes
   WHERE processo_id = _processo_id
     AND workspace_id = _workspace_id
     AND questao_id IS NOT DISTINCT FROM _questao_id;

  INSERT INTO public.juridico_conclusoes (
    processo_id, workspace_id, questao_id, aplicacao_id,
    versao, texto, estado, autor_id
  )
  VALUES (
    _processo_id, _workspace_id, _questao_id, _aplicacao_id,
    _next_version, btrim(_texto), 'rascunho', auth.uid()
  )
  RETURNING id INTO _conclusao_id;

  RETURN _conclusao_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) TO authenticated;

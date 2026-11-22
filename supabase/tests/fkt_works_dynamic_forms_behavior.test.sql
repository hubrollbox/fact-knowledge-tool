-- Behavioural regression tests for FKT Works dynamic forms (Issue #38).
-- Fixtures are created inside this transaction and rolled back; never run against production.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at)
VALUES
  ('a3800000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'fkt-works-owner@example.test', now(), now()),
  ('a3800000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'fkt-works-editor@example.test', now(), now()),
  ('a3800000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'fkt-works-viewer@example.test', now(), now()),
  ('a3800000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'fkt-works-outsider@example.test', now(), now());

INSERT INTO public.workspaces (id, user_id, modulo, name)
VALUES
  ('b3800000-0000-4000-8000-000000000001', 'a3800000-0000-4000-8000-000000000001', 'obras', 'FKT Works forms test A'),
  ('b3800000-0000-4000-8000-000000000002', 'a3800000-0000-4000-8000-000000000004', 'obras', 'FKT Works forms test B');

INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES
  ('b3800000-0000-4000-8000-000000000001', 'a3800000-0000-4000-8000-000000000002', 'editor'),
  ('b3800000-0000-4000-8000-000000000001', 'a3800000-0000-4000-8000-000000000003', 'viewer');

INSERT INTO public.obras (id, workspace_id, nome)
VALUES
  ('c3800000-0000-4000-8000-000000000001', 'b3800000-0000-4000-8000-000000000001', 'Obra de teste'),
  ('c3800000-0000-4000-8000-000000000002', 'b3800000-0000-4000-8000-000000000002', 'Obra externa');

INSERT INTO public.obras_visitas (id, workspace_id, obra_id, data_visita)
VALUES
  ('d3800000-0000-4000-8000-000000000001', 'b3800000-0000-4000-8000-000000000001', 'c3800000-0000-4000-8000-000000000001', current_date),
  ('d3800000-0000-4000-8000-000000000002', 'b3800000-0000-4000-8000-000000000002', 'c3800000-0000-4000-8000-000000000002', current_date);

SELECT plan(4);

-- Editor creates and publishes a model, then creates and completes a response.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a3800000-0000-4000-8000-000000000002', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _form_id uuid;
  _response_id uuid;
  _version_id uuid;
  _definition jsonb := '{
    "sections": [{
      "id": "section-1",
      "title": "Inspecção",
      "fields": [
        {"id":"date-field","label":"Data de verificação","type":"date","required":true},
        {"id":"choice-field","label":"Resultado","type":"choice","required":true,"options":["Conforme","Não conforme"]},
        {"id":"boolean-field","label":"Confirmado","type":"boolean","required":true}
      ]
    }]
  }'::jsonb;
  _caught boolean;
  _count integer;
BEGIN
  INSERT INTO public.obras_formularios
    (workspace_id, nome, tipo, draft_definicao)
  VALUES
    ('b3800000-0000-4000-8000-000000000001', 'Checklist de teste', 'inspeccao', _definition)
  RETURNING id INTO _form_id;

  SELECT id INTO _version_id
  FROM public.publicar_obras_formulario(_form_id);
  IF _version_id IS NULL THEN RAISE EXCEPTION 'Publishing did not return a version'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.obras_formularios
    WHERE id = _form_id AND draft_definicao IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Published draft was not cleared atomically';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.obras_formularios_versoes
    WHERE id = _version_id AND definicao = _definition
  ) THEN
    RAISE EXCEPTION 'Published version does not preserve the saved draft snapshot';
  END IF;

  SELECT id INTO _response_id
  FROM public.criar_obras_formulario_resposta(
    _form_id,
    'c3800000-0000-4000-8000-000000000001',
    'd3800000-0000-4000-8000-000000000001',
    NULL
  );
  IF _response_id IS NULL THEN RAISE EXCEPTION 'Response was not created'; END IF;

  UPDATE public.obras_formularios_respostas
  SET respostas = '{"date-field":"2026-02-31","choice-field":"Conforme","boolean-field":false}'::jsonb
  WHERE id = _response_id;

  _caught := false;
  BEGIN
    PERFORM public.concluir_obras_formulario_resposta(_response_id);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'invalid date unexpectedly accepted' THEN RAISE; END IF;
    _caught := position('data inexistente' in SQLERRM) > 0;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Impossible calendar date was not rejected'; END IF;

  UPDATE public.obras_formularios_respostas
  SET respostas = '{"date-field":"2026-02-28","choice-field":"Conforme"}'::jsonb
  WHERE id = _response_id;

  _caught := false;
  BEGIN
    PERFORM public.concluir_obras_formulario_resposta(_response_id);
  EXCEPTION WHEN raise_exception THEN
    _caught := position('Campo obrigatório' in SQLERRM) > 0;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Missing required boolean field was not rejected'; END IF;

  UPDATE public.obras_formularios_respostas
  SET respostas = '{"date-field":"2026-02-28","choice-field":"Desconhecido","boolean-field":false}'::jsonb
  WHERE id = _response_id;

  _caught := false;
  BEGIN
    PERFORM public.concluir_obras_formulario_resposta(_response_id);
  EXCEPTION WHEN raise_exception THEN
    _caught := position('escolha' in SQLERRM) > 0;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Choice outside the published options was not rejected'; END IF;

  UPDATE public.obras_formularios_respostas
  SET respostas = '{"date-field":"2026-02-28","choice-field":"Conforme","boolean-field":false}'::jsonb
  WHERE id = _response_id;

  PERFORM public.concluir_obras_formulario_resposta(_response_id);

  _caught := false;
  BEGIN
    UPDATE public.obras_formularios_respostas
    SET respostas = '{"tampered":true}'::jsonb
    WHERE id = _response_id;
  EXCEPTION WHEN raise_exception THEN
    _caught := position('imutável' in SQLERRM) > 0;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Completed response was mutable'; END IF;

  _caught := false;
  BEGIN
    UPDATE public.obras_formularios_versoes
    SET definicao = '{"tampered":true}'::jsonb
    WHERE id = _version_id;
  EXCEPTION WHEN insufficient_privilege THEN
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Published version could be edited directly'; END IF;

  SELECT count(*) INTO _count
  FROM public.obras_formularios_respostas
  WHERE id = _response_id AND estado = 'concluido'
    AND versao_id = _version_id
    AND definicao_snapshot = _definition;
  IF _count <> 1 THEN RAISE EXCEPTION 'Completed response did not preserve the published definition version'; END IF;
END;
$$ $test$, 'editor can publish and complete a response; server validates dates and choices and preserves version snapshot');

RESET ROLE;

-- Viewer can read models/responses in its workspace, but cannot create or edit them.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a3800000-0000-4000-8000-000000000003', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _count integer;
BEGIN
  SELECT count(*) INTO _count FROM public.obras_formularios
  WHERE workspace_id = 'b3800000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Viewer should read models in its workspace'; END IF;

  BEGIN
    INSERT INTO public.obras_formularios (workspace_id, nome, tipo, draft_definicao)
    VALUES ('b3800000-0000-4000-8000-000000000001', 'Viewer model', 'visita', '{"sections":[]}'::jsonb);
    RAISE EXCEPTION 'Viewer unexpectedly created a form';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$ $test$, 'viewer can read forms but cannot create them');
RESET ROLE;

-- A user from another workspace cannot see or use workspace A forms.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a3800000-0000-4000-8000-000000000004', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _count integer;
  _caught boolean := false;
BEGIN
  SELECT count(*) INTO _count FROM public.obras_formularios
  WHERE workspace_id = 'b3800000-0000-4000-8000-000000000001';
  IF _count <> 0 THEN RAISE EXCEPTION 'External workspace user read another workspace model'; END IF;

  BEGIN
    PERFORM public.criar_obras_formulario_resposta(
      '00000000-0000-4000-8000-000000000001',
      'c3800000-0000-4000-8000-000000000001',
      'd3800000-0000-4000-8000-000000000001',
      NULL
    );
  EXCEPTION WHEN raise_exception THEN
    _caught := position('permissões' in SQLERRM) > 0 OR position('não encontrado' in SQLERRM) > 0;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'External workspace user was not rejected by response creation'; END IF;
END;
$$ $test$, 'workspace isolation blocks reads and response creation');

RESET ROLE;

-- Owner cannot publish a model against a visit from a different workspace.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a3800000-0000-4000-8000-000000000001', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _form_id uuid;
  _definition jsonb := '{"sections":[{"id":"s","title":"Secção","fields":[]}]}'::jsonb;
  _caught boolean := false;
BEGIN
  INSERT INTO public.obras_formularios (workspace_id, nome, tipo, draft_definicao)
  VALUES ('b3800000-0000-4000-8000-000000000001', 'Modelo owner', 'visita', _definition)
  RETURNING id INTO _form_id;

  PERFORM public.publicar_obras_formulario(_form_id);
  BEGIN
    PERFORM public.criar_obras_formulario_resposta(
      _form_id,
      'c3800000-0000-4000-8000-000000000002',
      'd3800000-0000-4000-8000-000000000002',
      NULL
    );
  EXCEPTION WHEN raise_exception THEN
    _caught := position('permissões' in SQLERRM) > 0 OR position('não pertence' in SQLERRM) > 0;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Cross-workspace visit was not rejected'; END IF;
END;
$$ $test$, 'owner cannot create a response against another workspace visit');

SELECT * FROM finish();
ROLLBACK;

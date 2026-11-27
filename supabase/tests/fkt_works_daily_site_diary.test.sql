-- Issue #39: daily site diary schema and audit coverage.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;

INSERT INTO auth.users (id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
 ('a3900000-0000-4000-8000-000000000001','authenticated','authenticated','fkt-works-diary-owner@example.test','{"full_name":"Autor Diário Teste"}'::jsonb,now(),now());
INSERT INTO public.workspaces (id,user_id,modulo,name) VALUES
 ('b3900000-0000-4000-8000-000000000001','a3900000-0000-4000-8000-000000000001','obras','FKT Works diary test');
INSERT INTO public.obras (id,workspace_id,nome) VALUES
 ('c3900000-0000-4000-8000-000000000001','b3900000-0000-4000-8000-000000000001','Obra diário teste');

SELECT plan(13);
SELECT has_column('public','obras_visitas','tipo_registo','visit records support diary entry types');
SELECT has_column('public','obras_visitas','created_by_name','visit records preserve a human-readable author snapshot');
SELECT has_column('public','obras_visitas','trabalhos_executados','visit records store executed work');
SELECT has_column('public','obras_visitas','equipa_intervenientes','visit records store teams and participants');
SELECT has_column('public','obras_visitas','equipamentos','visit records store equipment');
SELECT has_column('public','obras_visitas','materiais','visit records store materials');
SELECT has_column('public','obras_visitas','condicionantes','visit records store constraints');
SELECT has_column('public','obras_visitas','atrasos','visit records store delays');
SELECT has_trigger('public','obras_visitas','obras_visitas_historico','visit changes are captured in immutable history');
SELECT has_trigger('public','obras_visitas','obras_visitas_validar_autoria','diary entry authorship is set and immutable');
SELECT ok(
  (SELECT NOT p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='private' AND p.proname='validar_autoria_obras_visita'),
  'diary authorship trigger runs as SECURITY INVOKER'
);
SELECT has_index('public','obras_visitas','obras_visitas_workspace_date_type_idx','diary filtering has a workspace/date/type index');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a3900000-0000-4000-8000-000000000001',true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a3900000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"full_name":"Autor Diário Teste"}}',
  true
);
SELECT lives_ok($test$
DO $$
DECLARE _visit_id uuid := 'd3900000-0000-4000-8000-000000000001'; _author uuid; _author_name text;
        _blocked boolean := false; _name_blocked boolean := false; _history_count integer;
BEGIN
  INSERT INTO public.obras_visitas (id,workspace_id,obra_id,data_visita,tipo_registo,trabalhos_executados)
  VALUES (_visit_id,'b3900000-0000-4000-8000-000000000001','c3900000-0000-4000-8000-000000000001',current_date,'diario','Trabalhos de teste');
  SELECT created_by, created_by_name INTO _author, _author_name FROM public.obras_visitas WHERE id=_visit_id;
  IF _author IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'created_by was not set to authenticated user'; END IF;
  IF _author_name IS DISTINCT FROM 'Autor Diário Teste' THEN RAISE EXCEPTION 'created_by_name snapshot was not populated'; END IF;
  UPDATE public.obras_visitas SET trabalhos_executados='Trabalhos actualizados' WHERE id=_visit_id;
  BEGIN
    UPDATE public.obras_visitas SET created_by='a3900000-0000-4000-8000-000000000099' WHERE id=_visit_id;
  EXCEPTION WHEN SQLSTATE '42501' THEN _blocked := true;
  END;
  IF NOT _blocked THEN RAISE EXCEPTION 'Changing the original author was not blocked'; END IF;
  BEGIN
    UPDATE public.obras_visitas SET created_by_name='Nome adulterado' WHERE id=_visit_id;
  EXCEPTION WHEN SQLSTATE '42501' THEN _name_blocked := true;
  END;
  IF NOT _name_blocked THEN RAISE EXCEPTION 'Changing the author name snapshot was not blocked'; END IF;
  SELECT count(*) INTO _history_count FROM public.obras_historico_eventos
    WHERE entidade='obras_visitas' AND entidade_id=_visit_id AND operacao IN ('INSERT','UPDATE');
  IF _history_count <> 2 THEN RAISE EXCEPTION 'Expected insert and update history events, got %',_history_count; END IF;
END;
$$
$test$, 'authenticated author is assigned, immutable, and insert/update are recorded in history');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
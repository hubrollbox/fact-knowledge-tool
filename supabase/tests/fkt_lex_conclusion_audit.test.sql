-- FKT Lex #68: regression checks for immutable, workspace-scoped conclusion history.
-- Behavioural review transitions are additionally exercised through authenticated
-- application tests; this file protects the database-level invariants.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _table text;
  _constraint text;
BEGIN
  -- Every legal record, including the append-only audit log, must enforce RLS.
  FOREACH _table IN ARRAY ARRAY[
    'juridico_processos','juridico_partes','juridico_documentos','juridico_prazos',
    'juridico_factos','juridico_questoes','juridico_fontes',
    'juridico_factos_documentos','juridico_questoes_factos','juridico_questoes_fontes',
    'juridico_aplicacoes','juridico_aplicacoes_factos','juridico_aplicacoes_fontes',
    'juridico_conclusoes','juridico_conclusoes_eventos','juridico_conclusoes_snapshots'
  ] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', _table)::regclass) THEN
      RAISE EXCEPTION 'RLS is not enabled on public.%', _table;
    END IF;
    IF has_table_privilege('anon', format('public.%I', _table), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', _table), 'INSERT')
      OR has_table_privilege('anon', format('public.%I', _table), 'UPDATE')
      OR has_table_privilege('anon', format('public.%I', _table), 'DELETE')
      OR has_table_privilege('anon', format('public.%I', _table), 'TRUNCATE') THEN
      RAISE EXCEPTION 'anon retains direct privileges on public.%', _table;
    END IF;
  END LOOP;

  -- Conclusion versions and events are append-only for API roles.
  FOREACH _table IN ARRAY ARRAY['juridico_conclusoes','juridico_conclusoes_eventos','juridico_conclusoes_snapshots'] LOOP
    IF has_table_privilege('authenticated', format('public.%I', _table), 'UPDATE')
      OR has_table_privilege('authenticated', format('public.%I', _table), 'DELETE')
      OR has_table_privilege('authenticated', format('public.%I', _table), 'TRUNCATE')
      OR has_table_privilege('authenticated', format('public.%I', _table), 'TRIGGER') THEN
      RAISE EXCEPTION 'authenticated has mutation privileges on append-only table public.%', _table;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('authenticated', 'public.juridico_conclusoes', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'public.juridico_conclusoes_eventos', 'SELECT')
    OR NOT has_table_privilege('authenticated', 'public.juridico_conclusoes_snapshots', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated must be able to read conclusions and their audit events';
  END IF;

  IF has_table_privilege('authenticated', 'public.juridico_conclusoes_eventos', 'INSERT')
    OR has_table_privilege('authenticated', 'public.juridico_conclusoes_snapshots', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated must not insert audit events or snapshots directly';
  END IF;

  -- History must be protected from cascading deletion of its parent records.
  FOREACH _constraint IN ARRAY ARRAY[
    'juridico_conclusoes_processo_id_workspace_id_fkey',
    'juridico_conclusoes_questao_id_processo_id_workspace_id_fkey'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = _constraint AND contype = 'f' AND confdeltype = 'r'
    ) THEN
      RAISE EXCEPTION 'Conclusion history requires ON DELETE RESTRICT: %', _constraint;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.juridico_conclusoes'::regclass
      AND tgname = 'juridico_conclusoes_immutable'
      AND tgenabled = 'A'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.juridico_conclusoes_eventos'::regclass
      AND tgname = 'juridico_conclusoes_eventos_immutable'
      AND tgenabled = 'A'
  ) THEN
    RAISE EXCEPTION 'Append-only mutation protection triggers must be ENABLE ALWAYS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.juridico_conclusoes_snapshots'::regclass
      AND tgname = 'juridico_conclusoes_snapshots_immutable'
      AND tgenabled = 'A'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.juridico_conclusoes'::regclass
      AND tgname = 'juridico_conclusoes_capture_context'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Conclusion context snapshot trigger or immutability trigger is missing';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.create_juridico_conclusao_version(uuid,uuid,uuid,uuid,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.create_juridico_conclusao_version(uuid,uuid,uuid,uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Conclusion creation RPC grants are not least-privilege';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.transition_juridico_conclusao(uuid,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.transition_juridico_conclusao(uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Conclusion transition RPC grants are not least-privilege';
  END IF;
END;
$$ $test$, 'FKT Lex conclusion history is RLS-protected, append-only and workspace-safe');

SELECT * FROM finish();
ROLLBACK;

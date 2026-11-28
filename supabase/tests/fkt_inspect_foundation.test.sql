-- FKT Inspect Phase 1: base entities and deny-by-default.
-- Run after migrations with: supabase test db

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _table text;
  _policy_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspaces'::regclass
      AND conname = 'workspaces_modulo_check'
      AND pg_get_constraintdef(oid) LIKE '%inspect%'
  ) THEN
    RAISE EXCEPTION 'O módulo inspect não foi adicionado à constraint Core';
  END IF;

  FOREACH _table IN ARRAY ARRAY[
    'inspect_organisations',
    'inspect_clients',
    'inspect_establishments'
  ] LOOP
    IF to_regclass(format('public.%I', _table)) IS NULL THEN
      RAISE EXCEPTION 'Falta a tabela public.%', _table;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      WHERE c.oid = to_regclass(format('public.%I', _table))
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS não está activa em public.%', _table;
    END IF;

    IF has_table_privilege('anon', format('public.%I', _table), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', _table), 'INSERT')
      OR has_table_privilege('anon', format('public.%I', _table), 'UPDATE')
      OR has_table_privilege('anon', format('public.%I', _table), 'DELETE') THEN
      RAISE EXCEPTION 'anon mantém privilégios em public.%', _table;
    END IF;

    IF has_table_privilege('authenticated', format('public.%I', _table), 'SELECT')
      OR has_table_privilege('authenticated', format('public.%I', _table), 'INSERT')
      OR has_table_privilege('authenticated', format('public.%I', _table), 'UPDATE')
      OR has_table_privilege('authenticated', format('public.%I', _table), 'DELETE') THEN
      RAISE EXCEPTION 'authenticated não deve ter privilégios antes da fase 3 em public.%', _table;
    END IF;

    SELECT count(*) INTO _policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = _table;
    IF _policy_count <> 0 THEN
      RAISE EXCEPTION 'A fase 1 não deve criar policies em public.%', _table;
    END IF;
  END LOOP;

  IF to_regclass('public.inspect_client_establishments') IS NOT NULL THEN
    RAISE EXCEPTION 'A relação temporal pertence à fase 2';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.inspect_organisations'::regclass
      AND tgname = 'inspect_organisations_actor_fields'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Falta trigger de autoria na organização';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname = 'inspect_set_actor_fields'
      AND NOT p.prosecdef
      AND p.proconfig @> ARRAY['search_path=pg_catalog, auth']
  ) THEN
    RAISE EXCEPTION 'A função de autoria não tem search_path controlado ou mudou para SECURITY DEFINER';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'private.inspect_set_actor_fields()',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'private.inspect_set_actor_fields()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'A função de trigger não deve ser invocável directamente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inspect_organisations'::regclass
      AND conname = 'inspect_organisations_workspace_id_key'
  ) THEN
    RAISE EXCEPTION 'A organização não está limitada a uma por workspace';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inspect_clients'::regclass
      AND contype = 'f'
      AND confrelid = 'public.inspect_organisations'::regclass
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inspect_establishments'::regclass
      AND contype = 'f'
      AND confrelid = 'public.inspect_organisations'::regclass
  ) THEN
    RAISE EXCEPTION 'Clientes e estabelecimentos devem pertencer a uma organização';
  END IF;
END;
$$ $test$, 'Fase 1 cria entidades base com RLS e acesso negado por defeito');

SELECT * FROM finish();
ROLLBACK;

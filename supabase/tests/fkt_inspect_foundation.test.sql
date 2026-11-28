-- FKT Inspect foundation: schema, tenant boundaries, RLS and grants.
-- Run after migrations with: supabase test db

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _table text;
  _policy_count integer;
  _table_name text;
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
    'inspect_establishments',
    'inspect_client_establishments'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = _table AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS não está activa em public.%', _table;
    END IF;

    IF has_table_privilege('anon', format('public.%I', _table), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', _table), 'INSERT')
      OR has_table_privilege('anon', format('public.%I', _table), 'UPDATE')
      OR has_table_privilege('anon', format('public.%I', _table), 'DELETE') THEN
      RAISE EXCEPTION 'anon mantém privilégios em public.%', _table;
    END IF;

    IF has_table_privilege('authenticated', format('public.%I', _table), 'DELETE') THEN
      RAISE EXCEPTION 'DELETE directo não deve estar concedido em public.%', _table;
    END IF;

    SELECT count(*) INTO _policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = _table
      AND 'authenticated' = ANY(roles);
    IF _policy_count < 2 THEN
      RAISE EXCEPTION 'Políticas RLS insuficientes em public.%', _table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.inspect_client_establishments'::regclass
      AND tgname = 'inspect_client_establishments_period_guard'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Falta trigger que impede vigências sobrepostas';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname = 'inspect_guard_client_establishment_period'
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
  ) THEN
    RAISE EXCEPTION 'Trigger function não está isolada com search_path fixo';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'private.inspect_guard_client_establishment_period()',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'private.inspect_guard_client_establishment_period()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'A trigger function não deve ser invocável directamente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid IN (
      'public.inspect_clients'::regclass,
      'public.inspect_establishments'::regclass,
      'public.inspect_client_establishments'::regclass
    )
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      AND confrelid IN (
        'public.inspect_clients'::regclass,
        'public.inspect_establishments'::regclass
      )
  ) THEN
    RAISE EXCEPTION 'Foi encontrada FK simples onde é exigida integridade composta por organização';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inspect_organisations'
      AND cmd = 'INSERT'
      AND coalesce(with_check, '') NOT LIKE '%workspace_is_owner%'
  ) THEN
    RAISE EXCEPTION 'Criação de organização não está limitada ao owner do workspace';
  END IF;
END;
$$ $test$, 'FKT Inspect foundation enforces tenant RLS, explicit grants and temporal relation guard');

SELECT * FROM finish();
ROLLBACK;

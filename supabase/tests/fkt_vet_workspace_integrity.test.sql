-- Regression checks for FKT Vet workspace integrity migration.
-- Run against the local Supabase database after applying migrations:
--   supabase db reset
--   supabase test db
-- This file deliberately performs catalog assertions only; behavioural RLS
-- tests with authenticated users belong in the application integration suite.

BEGIN;

DO $$
DECLARE
  _table text;
  _constraint text;
  _policy record;
BEGIN
  -- The puppy workspace must be derived and persisted.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canil_cachorros'
      AND column_name = 'workspace_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'canil_cachorros.workspace_id must exist and be NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.canil_cachorros'::regclass
      AND tgname = 'canil_cachorros_set_workspace'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'canil_cachorros workspace derivation trigger is missing';
  END IF;

  -- All animal references must be workspace-scoped and restrictive on delete.
  FOREACH _constraint IN ARRAY ARRAY[
    'canil_registos_clinicos_workspace_animal_fkey',
    'canil_reservas_workspace_animal_fkey',
    'canil_ninhadas_workspace_mae_fkey',
    'canil_ninhadas_workspace_pai_fkey',
    'canil_cachorros_workspace_animal_fkey',
    'canil_cachorros_workspace_ninhada_fkey'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = _constraint
        AND contype = 'f'
        AND confdeltype = 'r'
    ) THEN
      RAISE EXCEPTION 'Expected RESTRICT foreign key missing or misconfigured: %', _constraint;
    END IF;
  END LOOP;

  -- Puppy CRUD must have dedicated role-aware policies.
  FOREACH _constraint IN ARRAY ARRAY[
    'canil_cachorros_select',
    'canil_cachorros_insert',
    'canil_cachorros_update',
    'canil_cachorros_delete'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'canil_cachorros'
        AND policyname = _constraint
        AND 'authenticated' = ANY (roles)
    ) THEN
      RAISE EXCEPTION 'Expected authenticated puppy policy missing: %', _constraint;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'canil_cachorros'
      AND policyname = 'canil_cachorros_insert'
      AND with_check IS NOT NULL
      AND with_check LIKE '%editor%'
      AND with_check LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Puppy INSERT policy must restrict writes to owner/admin/editor';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'canil_cachorros'
      AND policyname = 'canil_cachorros_update'
      AND with_check IS NOT NULL
      AND with_check LIKE '%editor%'
      AND with_check LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Puppy UPDATE policy must restrict writes and prevent workspace moves';
  END IF;

  -- Anonymous role must not retain any direct table privilege on Canil tables.
  FOREACH _table IN ARRAY ARRAY[
    'canil_animais',
    'canil_registos_clinicos',
    'canil_ninhadas',
    'canil_cachorros',
    'canil_reservas'
  ] LOOP
    IF has_table_privilege('anon', format('public.%I', _table), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', _table), 'INSERT')
      OR has_table_privilege('anon', format('public.%I', _table), 'UPDATE')
      OR has_table_privilege('anon', format('public.%I', _table), 'DELETE')
      OR has_table_privilege('anon', format('public.%I', _table), 'TRUNCATE') THEN
      RAISE EXCEPTION 'anon retains a direct privilege on public.%', _table;
    END IF;
  END LOOP;

  -- All Canil write policies on UPDATE must include WITH CHECK.
  FOR _policy IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'canil_animais',
        'canil_registos_clinicos',
        'canil_ninhadas',
        'canil_reservas',
        'canil_cachorros'
      )
      AND cmd = 'UPDATE'
      AND with_check IS NULL
  LOOP
    RAISE EXCEPTION 'UPDATE policy % on % lacks WITH CHECK',
      _policy.policyname, _policy.tablename;
  END LOOP;
END;
$$;

ROLLBACK;

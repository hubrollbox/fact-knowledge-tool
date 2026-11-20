-- Catalogue-level permission matrix regression test for FKT Vet.
-- Behavioural scenarios are covered by fkt_vet_rls_behavior.test.sql.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _table text;
  _command text;
  _policy record;
  _expression text;
  _tables text[] := ARRAY[
    'canil_animais',
    'canil_ninhadas',
    'canil_cachorros',
    'canil_registos_clinicos',
    'canil_reservas'
  ];
  _commands text[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
BEGIN
  FOREACH _table IN ARRAY _tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = _table
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on public.%', _table;
    END IF;

    FOREACH _command IN ARRAY _commands LOOP
      SELECT * INTO _policy
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = _table
        AND cmd = _command
        AND permissive = 'PERMISSIVE'
        AND roles @> ARRAY['authenticated']::name[];

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Missing authenticated % policy on public.%', _command, _table;
      END IF;

      IF 'anon' = ANY (_policy.roles) OR 'public' = ANY (_policy.roles) THEN
        RAISE EXCEPTION 'Anonymous/public role unexpectedly included in policy on public.%', _table;
      END IF;

      _expression := lower(coalesce(_policy.qual, '') || ' ' || coalesce(_policy.with_check, ''));

      IF _command = 'SELECT' THEN
        IF position('workspace_members' in _expression) = 0
           OR position('workspaces' in _expression) = 0 THEN
          RAISE EXCEPTION 'SELECT policy on public.% must recognise members and workspace owners', _table;
        END IF;
      ELSE
        IF position('editor' in _expression) = 0
           OR position('admin' in _expression) = 0
           OR position('workspaces' in _expression) = 0 THEN
          RAISE EXCEPTION '% policy on public.% must restrict writes to owner/admin/editor', _command, _table;
        END IF;
        IF position('viewer' in _expression) > 0 THEN
          RAISE EXCEPTION 'Viewer must not appear as a write-authorised role on public.%', _table;
        END IF;
      END IF;

      IF _command = 'UPDATE' AND _policy.with_check IS NULL THEN
        RAISE EXCEPTION 'UPDATE policy on public.% lacks WITH CHECK', _table;
      END IF;
      IF _command = 'INSERT' AND _policy.with_check IS NULL THEN
        RAISE EXCEPTION 'INSERT policy on public.% lacks WITH CHECK', _table;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ $test$, 'all five FKT Vet tables enforce the documented owner/admin/editor/viewer policy matrix');

SELECT * FROM finish();
ROLLBACK;

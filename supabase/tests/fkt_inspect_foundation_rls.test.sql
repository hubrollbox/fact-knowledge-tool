-- FKT Inspect Phase 1: deny-by-default access contract.
-- RLS policies and authenticated grants belong to Phase 3.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(3);

SELECT ok(
  (SELECT bool_and(relrowsecurity)
   FROM pg_class
   WHERE oid IN (
     'public.inspect_organisations'::regclass,
     'public.inspect_parties'::regclass,
     'public.inspect_clients'::regclass,
     'public.inspect_establishments'::regclass
   )),
  'RLS está activa nas quatro tabelas Inspect'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('public.inspect_organisations'::regclass),
        ('public.inspect_parties'::regclass),
        ('public.inspect_clients'::regclass),
        ('public.inspect_establishments'::regclass)
    ) AS t(relid)
    CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(role_name)
    WHERE has_table_privilege(r.role_name, t.relid, 'SELECT')
       OR has_table_privilege(r.role_name, t.relid, 'INSERT')
       OR has_table_privilege(r.role_name, t.relid, 'UPDATE')
       OR has_table_privilege(r.role_name, t.relid, 'DELETE')
  ),
  'anon e authenticated não têm privilégios directos nas tabelas Inspect nesta fase'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'inspect_organisations',
        'inspect_parties',
        'inspect_clients',
        'inspect_establishments'
      )
  ),
  'Não existem policies antes da fase de permissões'
);

SELECT * FROM finish();
ROLLBACK;

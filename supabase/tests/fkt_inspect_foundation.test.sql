-- FKT Inspect Phase 1: base entities and deny-by-default.
-- Run with: supabase test db --local

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;

BEGIN;
SELECT plan(35);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspaces'::regclass
      AND conname = 'workspaces_modulo_check'
      AND pg_get_constraintdef(oid) LIKE '%inspect%'
  ),
  'Core aceita o módulo inspect'
);

SELECT ok(to_regclass('public.inspect_organisations') IS NOT NULL, 'Tabela inspect_organisations existe');
SELECT ok(to_regclass('public.inspect_parties') IS NOT NULL, 'Tabela inspect_parties existe');
SELECT ok(to_regclass('public.inspect_clients') IS NOT NULL, 'Tabela inspect_clients existe');
SELECT ok(to_regclass('public.inspect_establishments') IS NOT NULL, 'Tabela inspect_establishments existe');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.inspect_organisations'::regclass), 'RLS activa em inspect_organisations');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.inspect_parties'::regclass), 'RLS activa em inspect_parties');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.inspect_clients'::regclass), 'RLS activa em inspect_clients');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.inspect_establishments'::regclass), 'RLS activa em inspect_establishments');

SELECT ok(NOT (has_table_privilege('anon','public.inspect_organisations','SELECT') OR has_table_privilege('anon','public.inspect_organisations','INSERT') OR has_table_privilege('anon','public.inspect_organisations','UPDATE') OR has_table_privilege('anon','public.inspect_organisations','DELETE')), 'anon sem privilégios em inspect_organisations');
SELECT ok(NOT (has_table_privilege('anon','public.inspect_parties','SELECT') OR has_table_privilege('anon','public.inspect_parties','INSERT') OR has_table_privilege('anon','public.inspect_parties','UPDATE') OR has_table_privilege('anon','public.inspect_parties','DELETE')), 'anon sem privilégios em inspect_parties');
SELECT ok(NOT (has_table_privilege('anon','public.inspect_clients','SELECT') OR has_table_privilege('anon','public.inspect_clients','INSERT') OR has_table_privilege('anon','public.inspect_clients','UPDATE') OR has_table_privilege('anon','public.inspect_clients','DELETE')), 'anon sem privilégios em inspect_clients');
SELECT ok(NOT (has_table_privilege('anon','public.inspect_establishments','SELECT') OR has_table_privilege('anon','public.inspect_establishments','INSERT') OR has_table_privilege('anon','public.inspect_establishments','UPDATE') OR has_table_privilege('anon','public.inspect_establishments','DELETE')), 'anon sem privilégios em inspect_establishments');

SELECT ok(NOT (has_table_privilege('authenticated','public.inspect_organisations','SELECT') OR has_table_privilege('authenticated','public.inspect_organisations','INSERT') OR has_table_privilege('authenticated','public.inspect_organisations','UPDATE') OR has_table_privilege('authenticated','public.inspect_organisations','DELETE')), 'authenticated sem privilégios em inspect_organisations');
SELECT ok(NOT (has_table_privilege('authenticated','public.inspect_parties','SELECT') OR has_table_privilege('authenticated','public.inspect_parties','INSERT') OR has_table_privilege('authenticated','public.inspect_parties','UPDATE') OR has_table_privilege('authenticated','public.inspect_parties','DELETE')), 'authenticated sem privilégios em inspect_parties');
SELECT ok(NOT (has_table_privilege('authenticated','public.inspect_clients','SELECT') OR has_table_privilege('authenticated','public.inspect_clients','INSERT') OR has_table_privilege('authenticated','public.inspect_clients','UPDATE') OR has_table_privilege('authenticated','public.inspect_clients','DELETE')), 'authenticated sem privilégios em inspect_clients');
SELECT ok(NOT (has_table_privilege('authenticated','public.inspect_establishments','SELECT') OR has_table_privilege('authenticated','public.inspect_establishments','INSERT') OR has_table_privilege('authenticated','public.inspect_establishments','UPDATE') OR has_table_privilege('authenticated','public.inspect_establishments','DELETE')), 'authenticated sem privilégios em inspect_establishments');

SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inspect_organisations'), 'Sem policies prematuras em inspect_organisations');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inspect_parties'), 'Sem policies prematuras em inspect_parties');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inspect_clients'), 'Sem policies prematuras em inspect_clients');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='inspect_establishments'), 'Sem policies prematuras em inspect_establishments');

SELECT ok(to_regclass('public.inspect_client_establishments') IS NULL, 'Relação temporal reservada para a fase 2');

SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.inspect_organisations'::regclass AND tgname='inspect_organisations_actor_fields' AND NOT tgisinternal), 'Trigger de autoria em inspect_organisations');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.inspect_parties'::regclass AND tgname='inspect_parties_actor_fields' AND NOT tgisinternal), 'Trigger de autoria em inspect_parties');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.inspect_clients'::regclass AND tgname='inspect_clients_actor_fields' AND NOT tgisinternal), 'Trigger de autoria em inspect_clients');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.inspect_establishments'::regclass AND tgname='inspect_establishments_actor_fields' AND NOT tgisinternal), 'Trigger de autoria em inspect_establishments');

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='inspect_set_actor_fields'
      AND NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=pg_catalog, auth']
  ),
  'Função de autoria é SECURITY INVOKER e tem search_path controlado'
);
SELECT ok(NOT has_function_privilege('authenticated','private.inspect_set_actor_fields()','EXECUTE'), 'authenticated não invoca directamente a função de trigger');
SELECT ok(NOT has_function_privilege('anon','private.inspect_set_actor_fields()','EXECUTE'), 'anon não invoca directamente a função de trigger');

SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspect_organisations'::regclass AND conname='inspect_organisations_workspace_id_key'), 'Uma organização Inspect por workspace');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspect_clients'::regclass AND contype='f' AND confrelid='public.inspect_organisations'::regclass), 'Cliente ligado a organização Inspect');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspect_parties'::regclass AND contype='f' AND confrelid='public.inspect_organisations'::regclass), 'Party ligada a organização Inspect');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspect_establishments'::regclass AND contype='f' AND confrelid='public.inspect_organisations'::regclass), 'Estabelecimento ligado a organização Inspect');

SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspect_clients'::regclass AND conname='inspect_clients_party_org_fk'),
  'Cliente só pode referenciar party da mesma organização'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.inspect_establishments'::regclass AND conname='inspect_establishments_operator_party_org_fk'),
  'Operador só pode pertencer à mesma organização'
);

SELECT * FROM finish();
ROLLBACK;

-- FKT Inspect Phase 1: base entities and deny-by-default.
-- Run with: supabase test db --local

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;

BEGIN;
SELECT plan(42);

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
SELECT ok(
  has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated mantém USAGE no schema private para os helpers Core'
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


-- Behavioural checks using a local fixture. No remote project is linked.
INSERT INTO auth.users (id,aud,role,email,raw_user_meta_data,created_at,updated_at)
VALUES
  ('a6100000-0000-4000-8000-000000000001','authenticated','authenticated','inspect-phase1-actor@example.test','{}'::jsonb,now(),now()),
  ('a6100000-0000-4000-8000-000000000099','authenticated','authenticated','inspect-phase1-forged@example.test','{}'::jsonb,now(),now());

SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000001',true);

INSERT INTO public.workspaces (id,user_id,modulo)
VALUES
  ('b6100000-0000-4000-8000-000000000001','a6100000-0000-4000-8000-000000000001','inspect'),
  ('b6100000-0000-4000-8000-000000000002','a6100000-0000-4000-8000-000000000001','inspect');

INSERT INTO public.inspect_organisations
  (id,workspace_id,organisation_type,display_name,created_by,updated_by)
VALUES
  ('c6100000-0000-4000-8000-000000000001','b6100000-0000-4000-8000-000000000001','consultant','Organização teste','a6100000-0000-4000-8000-000000000099','a6100000-0000-4000-8000-000000000099'),
  ('c6100000-0000-4000-8000-000000000002','b6100000-0000-4000-8000-000000000002','operator','Organização teste 2','a6100000-0000-4000-8000-000000000099','a6100000-0000-4000-8000-000000000099');

INSERT INTO public.inspect_parties
  (id,inspect_organisation_id,party_type,display_name,created_by,updated_by)
VALUES
  ('d6100000-0000-4000-8000-000000000001','c6100000-0000-4000-8000-000000000001','legal_entity','Operador teste','a6100000-0000-4000-8000-000000000099','a6100000-0000-4000-8000-000000000099');

INSERT INTO public.inspect_clients
  (id,inspect_organisation_id,display_name,party_id,created_by,updated_by)
VALUES
  ('e6100000-0000-4000-8000-000000000001','c6100000-0000-4000-8000-000000000001','Cliente teste','d6100000-0000-4000-8000-000000000001','a6100000-0000-4000-8000-000000000099','a6100000-0000-4000-8000-000000000099');

INSERT INTO public.inspect_establishments
  (id,inspect_organisation_id,display_name,operator_party_id,operator_identification_status,created_by,updated_by)
VALUES
  ('f6100000-0000-4000-8000-000000000001','c6100000-0000-4000-8000-000000000001','Estabelecimento teste','d6100000-0000-4000-8000-000000000001','identified','a6100000-0000-4000-8000-000000000099','a6100000-0000-4000-8000-000000000099');

SELECT ok(
  (SELECT bool_and(created_by='a6100000-0000-4000-8000-000000000001'::uuid AND updated_by='a6100000-0000-4000-8000-000000000001'::uuid)
   FROM (
     SELECT created_by,updated_by FROM public.inspect_organisations WHERE id='c6100000-0000-4000-8000-000000000001'
     UNION ALL SELECT created_by,updated_by FROM public.inspect_parties WHERE id='d6100000-0000-4000-8000-000000000001'
     UNION ALL SELECT created_by,updated_by FROM public.inspect_clients WHERE id='e6100000-0000-4000-8000-000000000001'
     UNION ALL SELECT created_by,updated_by FROM public.inspect_establishments WHERE id='f6100000-0000-4000-8000-000000000001'
   ) actors),
  'Os quatro triggers derivam created_by e updated_by do actor autenticado'
);

UPDATE public.inspect_parties
SET display_name='Operador actualizado', updated_by='a6100000-0000-4000-8000-000000000099'
WHERE id='d6100000-0000-4000-8000-000000000001';

SELECT ok(
  (SELECT created_by='a6100000-0000-4000-8000-000000000001'::uuid
          AND updated_by='a6100000-0000-4000-8000-000000000001'::uuid
   FROM public.inspect_parties WHERE id='d6100000-0000-4000-8000-000000000001'),
  'O trigger preserva created_by e volta a derivar updated_by em UPDATE'
);

SELECT throws_ok(
  $test$UPDATE public.inspect_organisations
    SET workspace_id='b6100000-0000-4000-8000-000000000002'
    WHERE id='c6100000-0000-4000-8000-000000000001'$test$,
  '23514',
  'A organização não pode mudar de workspace'
);

SELECT throws_ok(
  $test$UPDATE public.inspect_parties
    SET inspect_organisation_id='c6100000-0000-4000-8000-000000000002'
    WHERE id='d6100000-0000-4000-8000-000000000001'$test$,
  '23514',
  'Uma party não pode mudar de organização'
);

SELECT throws_ok(
  $test$INSERT INTO public.inspect_clients (inspect_organisation_id,display_name,party_id)
    VALUES ('c6100000-0000-4000-8000-000000000002','Cliente cruzado','d6100000-0000-4000-8000-000000000001')$test$,
  '23503',
  'A FK composta impede ligar cliente a party de outra organização'
);

SELECT throws_ok(
  $test$INSERT INTO public.inspect_establishments
      (inspect_organisation_id,display_name,operator_identification_status)
    VALUES ('c6100000-0000-4000-8000-000000000001','Estabelecimento sem operador','identified')$test$,
  '23514',
  'Estado identified exige operator_party_id'
);

SELECT * FROM finish();
ROLLBACK;

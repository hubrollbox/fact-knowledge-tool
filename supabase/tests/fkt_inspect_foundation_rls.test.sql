-- Behavioural RLS tests for FKT Inspect portfolio foundation.
-- All fixtures are local and rolled back by the test transaction.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;

INSERT INTO auth.users (id,aud,role,email,created_at,updated_at) VALUES
 ('a6100000-0000-4000-8000-000000000001','authenticated','authenticated','inspect-owner-a@example.test',now(),now()),
 ('a6100000-0000-4000-8000-000000000002','authenticated','authenticated','inspect-editor-a@example.test',now(),now()),
 ('a6100000-0000-4000-8000-000000000003','authenticated','authenticated','inspect-viewer-a@example.test',now(),now()),
 ('a6100000-0000-4000-8000-000000000004','authenticated','authenticated','inspect-owner-b@example.test',now(),now());

INSERT INTO public.workspaces (id,user_id,modulo,name) VALUES
 ('b6100000-0000-4000-8000-000000000001','a6100000-0000-4000-8000-000000000001','inspect','Inspect organisation A'),
 ('b6100000-0000-4000-8000-000000000002','a6100000-0000-4000-8000-000000000004','inspect','Inspect organisation B');

INSERT INTO public.workspace_members (workspace_id,user_id,role) VALUES
 ('b6100000-0000-4000-8000-000000000001','a6100000-0000-4000-8000-000000000002','editor'),
 ('b6100000-0000-4000-8000-000000000001','a6100000-0000-4000-8000-000000000003','viewer');

SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000001',true);
INSERT INTO public.inspect_organisations (id,workspace_id,organisation_type,display_name) VALUES
 ('c6100000-0000-4000-8000-000000000001','b6100000-0000-4000-8000-000000000001','consultant','Consultora A');
SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000004',true);
INSERT INTO public.inspect_organisations (id,workspace_id,organisation_type,display_name) VALUES
 ('c6100000-0000-4000-8000-000000000002','b6100000-0000-4000-8000-000000000002','operator','Operador B');
SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000001',true);

INSERT INTO public.inspect_clients (id,inspect_organisation_id,display_name)
VALUES ('d6100000-0000-4000-8000-000000000001','c6100000-0000-4000-8000-000000000001','Cliente A');
INSERT INTO public.inspect_establishments (id,inspect_organisation_id,display_name)
VALUES
 ('e6100000-0000-4000-8000-000000000001','c6100000-0000-4000-8000-000000000001','Restaurante A'),
 ('e6100000-0000-4000-8000-000000000002','c6100000-0000-4000-8000-000000000002','Restaurante B');

SELECT plan(5);

-- Owner and editor can read their organisation's portfolio; editor can create.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000002',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.inspect_clients
 WHERE id='d6100000-0000-4000-8000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'Editor should read own organisation client'; END IF;

 INSERT INTO public.inspect_clients (inspect_organisation_id,display_name)
 VALUES ('c6100000-0000-4000-8000-000000000001','Cliente criado pelo editor');

 SELECT count(*) INTO n FROM public.inspect_clients
 WHERE display_name='Cliente criado pelo editor';
 IF n<>1 THEN RAISE EXCEPTION 'Editor should create client in own organisation'; END IF;
END $$ $test$, 'editor reads and creates records in own Inspect organisation');
RESET ROLE;

-- Viewer is read-only.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000003',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE n integer; denied boolean:=false;
BEGIN
 SELECT count(*) INTO n FROM public.inspect_clients;
 IF n<>2 THEN RAISE EXCEPTION 'Viewer should read both own clients'; END IF;
 BEGIN
  INSERT INTO public.inspect_clients (inspect_organisation_id,display_name)
  VALUES ('c6100000-0000-4000-8000-000000000001','Viewer must not create');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Viewer unexpectedly inserted client'; END IF;
END $$ $test$, 'viewer reads but cannot create Inspect portfolio records');
RESET ROLE;

-- Another workspace cannot discover or mutate organisation A.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000004',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE n integer; denied boolean:=false;
BEGIN
 SELECT count(*) INTO n FROM public.inspect_clients;
 IF n<>0 THEN RAISE EXCEPTION 'Workspace B can see organisation A clients'; END IF;
 SELECT count(*) INTO n FROM public.inspect_organisations
 WHERE id='c6100000-0000-4000-8000-000000000001';
 IF n<>0 THEN RAISE EXCEPTION 'Workspace B can see organisation A'; END IF;
 BEGIN
  INSERT INTO public.inspect_clients (inspect_organisation_id,display_name)
  VALUES ('c6100000-0000-4000-8000-000000000001','Cross tenant');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Workspace B inserted into organisation A'; END IF;
END $$ $test$, 'workspace B cannot read or write organisation A');
RESET ROLE;

-- Composite FKs reject a relation crossing organisation boundaries.
SELECT extensions.lives_ok($test$ DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  INSERT INTO public.inspect_client_establishments
    (inspect_organisation_id,client_id,establishment_id)
  VALUES
    ('c6100000-0000-4000-8000-000000000001',
     'd6100000-0000-4000-8000-000000000001',
     'e6100000-0000-4000-8000-000000000002');
 EXCEPTION WHEN foreign_key_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-organisation client/establishment relation was accepted'; END IF;
END $$ $test$, 'composite foreign keys reject cross-organisation relations');

-- Temporal trigger rejects overlapping [valid_from, valid_until) periods.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a6100000-0000-4000-8000-000000000001',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE denied boolean:=false;
BEGIN
 INSERT INTO public.inspect_client_establishments
  (inspect_organisation_id,client_id,establishment_id,valid_from,valid_until)
 VALUES
  ('c6100000-0000-4000-8000-000000000001',
   'd6100000-0000-4000-8000-000000000001',
   'e6100000-0000-4000-8000-000000000001',
   now()-interval '2 days',now()+interval '2 days');

 BEGIN
  INSERT INTO public.inspect_client_establishments
   (inspect_organisation_id,client_id,establishment_id,valid_from,valid_until)
  VALUES
   ('c6100000-0000-4000-8000-000000000001',
    'd6100000-0000-4000-8000-000000000001',
    'e6100000-0000-4000-8000-000000000001',
    now(),now()+interval '3 days');
 EXCEPTION WHEN exclusion_violation THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Overlapping client/establishment period was accepted'; END IF;
END $$ $test$, 'temporal relation trigger rejects overlapping periods');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

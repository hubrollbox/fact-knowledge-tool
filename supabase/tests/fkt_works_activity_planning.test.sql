-- Behavioural regression tests for FKT Works activity planning.
-- All fixtures are rolled back; this suite runs only against the local CI database.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;

INSERT INTO auth.users (id,aud,role,email,created_at,updated_at) VALUES
 ('a4400000-0000-4000-8000-000000000001','authenticated','authenticated','fkt-works-plan-owner@example.test',now(),now()),
 ('a4400000-0000-4000-8000-000000000002','authenticated','authenticated','fkt-works-plan-editor@example.test',now(),now()),
 ('a4400000-0000-4000-8000-000000000003','authenticated','authenticated','fkt-works-plan-viewer@example.test',now(),now()),
 ('a4400000-0000-4000-8000-000000000004','authenticated','authenticated','fkt-works-plan-outsider@example.test',now(),now());

INSERT INTO public.workspaces (id,user_id,modulo,name) VALUES
 ('b4400000-0000-4000-8000-000000000001','a4400000-0000-4000-8000-000000000001','obras','FKT Works planning A'),
 ('b4400000-0000-4000-8000-000000000002','a4400000-0000-4000-8000-000000000004','obras','FKT Works planning B');

INSERT INTO public.workspace_members (workspace_id,user_id,role) VALUES
 ('b4400000-0000-4000-8000-000000000001','a4400000-0000-4000-8000-000000000002','editor'),
 ('b4400000-0000-4000-8000-000000000001','a4400000-0000-4000-8000-000000000003','viewer');

INSERT INTO public.obras (id,workspace_id,nome) VALUES
 ('c4400000-0000-4000-8000-000000000001','b4400000-0000-4000-8000-000000000001','Obra A'),
 ('c4400000-0000-4000-8000-000000000002','b4400000-0000-4000-8000-000000000002','Obra B');

SELECT plan(4);

-- Editor creates a chain, dependencies block premature work and prevent cycles/regressions.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a4400000-0000-4000-8000-000000000002',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE _caught boolean; _count integer;
BEGIN
 INSERT INTO public.obras_actividades(id,workspace_id,obra_id,titulo,data_inicio_prevista,data_fim_prevista,created_by)
 VALUES
 ('d4400000-0000-4000-8000-000000000001','b4400000-0000-4000-8000-000000000001','c4400000-0000-4000-8000-000000000001','Preparação',current_date,current_date+1,auth.uid()),
 ('d4400000-0000-4000-8000-000000000002','b4400000-0000-4000-8000-000000000001','c4400000-0000-4000-8000-000000000001','Execução',current_date+2,current_date+3,auth.uid());
 PERFORM public.definir_dependencias_obras_actividade(
  'd4400000-0000-4000-8000-000000000002',ARRAY['d4400000-0000-4000-8000-000000000001']::uuid[]);
 _caught:=false;
 BEGIN
  UPDATE public.obras_actividades SET estado='em_curso' WHERE id='d4400000-0000-4000-8000-000000000002';
 EXCEPTION WHEN check_violation THEN _caught:=true;
 END;
 IF NOT _caught THEN RAISE EXCEPTION 'Activity started before its predecessor was completed'; END IF;
 UPDATE public.obras_actividades SET estado='concluida',data_inicio_real=current_date,data_fim_real=current_date WHERE id='d4400000-0000-4000-8000-000000000001';
 UPDATE public.obras_actividades SET estado='em_curso',data_inicio_real=current_date WHERE id='d4400000-0000-4000-8000-000000000002';
 INSERT INTO public.obras_actividades(id,workspace_id,obra_id,titulo,estado,created_by)
 VALUES ('d4400000-0000-4000-8000-000000000003','b4400000-0000-4000-8000-000000000001','c4400000-0000-4000-8000-000000000001','Actividade já iniciada','em_curso',auth.uid());
 _caught:=false;
 BEGIN
  PERFORM public.definir_dependencias_obras_actividade(
   'd4400000-0000-4000-8000-000000000003',ARRAY['d4400000-0000-4000-8000-000000000002']::uuid[]);
 EXCEPTION WHEN check_violation THEN _caught:=true;
 END;
 IF NOT _caught THEN RAISE EXCEPTION 'A pending dependency was added to an activity already in progress'; END IF;
 _caught:=false;
 BEGIN
  PERFORM public.definir_dependencias_obras_actividade(
   'd4400000-0000-4000-8000-000000000001',ARRAY['d4400000-0000-4000-8000-000000000002']::uuid[]);
 EXCEPTION WHEN check_violation THEN _caught:=true;
 END;
 IF NOT _caught THEN RAISE EXCEPTION 'Circular dependency was accepted'; END IF;
 _caught:=false;
 BEGIN
  UPDATE public.obras_actividades SET estado='planeada' WHERE id='d4400000-0000-4000-8000-000000000001';
 EXCEPTION WHEN check_violation THEN _caught:=true;
 END;
 IF NOT _caught THEN RAISE EXCEPTION 'Predecessor was reopened while dependent activity was in progress'; END IF;
 SELECT count(*) INTO _count FROM public.obras_actividades WHERE obra_id='c4400000-0000-4000-8000-000000000001';
 IF _count<>3 THEN RAISE EXCEPTION 'Expected three activities'; END IF;
END;
$$ $test$, 'editor can plan activities; dependency order, cycle and predecessor regression are enforced');
RESET ROLE;

-- Viewer can read but cannot create or edit activities.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a4400000-0000-4000-8000-000000000003',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE _caught boolean:=false; _count integer;
BEGIN
 SELECT count(*) INTO _count FROM public.obras_actividades WHERE obra_id='c4400000-0000-4000-8000-000000000001';
 IF _count<>3 THEN RAISE EXCEPTION 'Viewer cannot read its workspace activities'; END IF;
 BEGIN
  INSERT INTO public.obras_actividades(workspace_id,obra_id,titulo,created_by)
  VALUES('b4400000-0000-4000-8000-000000000001','c4400000-0000-4000-8000-000000000001','Viewer activity',auth.uid());
 EXCEPTION WHEN insufficient_privilege THEN _caught:=true;
 END;
 IF NOT _caught THEN RAISE EXCEPTION 'Viewer unexpectedly created an activity'; END IF;
END;
$$ $test$, 'viewer can read activities but cannot create them');
RESET ROLE;

-- Another workspace cannot read the activities or use the dependency RPC.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a4400000-0000-4000-8000-000000000004',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE _count integer; _caught boolean:=false;
BEGIN
 SELECT count(*) INTO _count FROM public.obras_actividades WHERE obra_id='c4400000-0000-4000-8000-000000000001';
 IF _count<>0 THEN RAISE EXCEPTION 'Workspace B read workspace A activities'; END IF;
 BEGIN
  PERFORM public.definir_dependencias_obras_actividade('d4400000-0000-4000-8000-000000000002',ARRAY[]::uuid[]);
 EXCEPTION WHEN insufficient_privilege THEN _caught:=true;
 END;
 IF NOT _caught THEN RAISE EXCEPTION 'External user could manage another workspace activity'; END IF;
END;
$$ $test$, 'workspace isolation blocks activity reads and writes');
RESET ROLE;

-- Structural and privilege regression checks.
SELECT extensions.lives_ok($test$ DO $$
DECLARE _table text;
BEGIN
 FOREACH _table IN ARRAY ARRAY['obras_actividades','obras_actividades_dependencias'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=_table AND c.relrowsecurity) THEN
   RAISE EXCEPTION 'RLS is not enabled on public.%',_table;
  END IF;
  IF has_table_privilege('anon',format('public.%I',_table),'SELECT') OR has_table_privilege('anon',format('public.%I',_table),'INSERT') OR has_table_privilege('anon',format('public.%I',_table),'UPDATE') OR has_table_privilege('anon',format('public.%I',_table),'DELETE') THEN
   RAISE EXCEPTION 'anon has direct privileges on public.%',_table;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=_table AND cmd='SELECT' AND 'authenticated'=ANY(roles) AND position('obras_can_read' in lower(coalesce(qual,'')))>0) THEN
   RAISE EXCEPTION 'Missing workspace-scoped SELECT policy on public.%',_table;
  END IF;
 END LOOP;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.obras_actividades_dependencias'::regclass AND conname='obras_actividades_dependencias_activity_fk')
 OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.obras_actividades_dependencias'::regclass AND conname='obras_actividades_dependencias_predecessor_fk') THEN RAISE EXCEPTION 'Dependency foreign keys are missing'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.definir_dependencias_obras_actividade(uuid,uuid[])'::regprocedure) THEN RAISE EXCEPTION 'Dependency RPC must be SECURITY INVOKER'; END IF;
END;
$$ $test$, 'planning tables enforce RLS, workspace-scoped policies and least privilege');

SELECT * FROM finish();
ROLLBACK;

-- Behavioural and security tests for the single FKT Works reception record.
-- Fixtures are isolated to the local CI database and rolled back.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;

INSERT INTO auth.users (id,aud,role,email,created_at,updated_at) VALUES
 ('a4500000-0000-4000-8000-000000000001','authenticated','authenticated','fkt-works-reception-owner@example.test',now(),now()),
 ('a4500000-0000-4000-8000-000000000002','authenticated','authenticated','fkt-works-reception-editor@example.test',now(),now()),
 ('a4500000-0000-4000-8000-000000000003','authenticated','authenticated','fkt-works-reception-viewer@example.test',now(),now()),
 ('a4500000-0000-4000-8000-000000000004','authenticated','authenticated','fkt-works-reception-outsider@example.test',now(),now());

INSERT INTO public.workspaces (id,user_id,modulo,name) VALUES
 ('b4500000-0000-4000-8000-000000000001','a4500000-0000-4000-8000-000000000001','obras','FKT Works reception A'),
 ('b4500000-0000-4000-8000-000000000002','a4500000-0000-4000-8000-000000000004','obras','FKT Works reception B');
INSERT INTO public.workspace_members (workspace_id,user_id,role) VALUES
 ('b4500000-0000-4000-8000-000000000001','a4500000-0000-4000-8000-000000000002','editor'),
 ('b4500000-0000-4000-8000-000000000001','a4500000-0000-4000-8000-000000000003','viewer');
INSERT INTO public.obras (id,workspace_id,nome) VALUES
 ('c4500000-0000-4000-8000-000000000001','b4500000-0000-4000-8000-000000000001','Obra recepção A'),
 ('c4500000-0000-4000-8000-000000000002','b4500000-0000-4000-8000-000000000002','Obra recepção B');
INSERT INTO public.obras_documentos (id,workspace_id,obra_id,titulo,categoria,created_by) VALUES
 ('d4500000-0000-4000-8000-000000000001','b4500000-0000-4000-8000-000000000001','c4500000-0000-4000-8000-000000000001','Auto de recepção','relatorio','a4500000-0000-4000-8000-000000000001'),
 ('d4500000-0000-4000-8000-000000000002','b4500000-0000-4000-8000-000000000002','c4500000-0000-4000-8000-000000000002','Documento externo','relatorio','a4500000-0000-4000-8000-000000000004');

SELECT plan(5);

-- Editor can create one reception and select documents belonging to the same work.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a4500000-0000-4000-8000-000000000002',true);
SELECT extensions.lives_ok($test$ DO $$
BEGIN
 INSERT INTO public.obras_recepcoes(id,workspace_id,obra_id,pendencias,documentos_ids,created_by)
 VALUES ('e4500000-0000-4000-8000-000000000001','b4500000-0000-4000-8000-000000000001','c4500000-0000-4000-8000-000000000001',
 '[{"id":"ocorrencia:1","origem":"ocorrencia","origem_id":"00000000-0000-0000-0000-000000000001","titulo":"Pendência","decisao":"","justificacao":""}]'::jsonb,
 ARRAY['d4500000-0000-4000-8000-000000000001']::uuid[],auth.uid());
 IF (SELECT cardinality(documentos_ids) FROM public.obras_recepcoes WHERE id='e4500000-0000-4000-8000-000000000001') <> 1 THEN
   RAISE EXCEPTION 'Selected reception document was not stored';
 END IF;
END $$ $test$, 'editor creates a single reception and associates same-work documents');

-- Database trigger blocks confirmation with undecided items and missing reservation reasons.
SELECT extensions.lives_ok($test$ DO $$
DECLARE caught boolean;
BEGIN
 caught:=false;
 BEGIN
  UPDATE public.obras_recepcoes SET estado='concluida' WHERE id='e4500000-0000-4000-8000-000000000001';
 EXCEPTION WHEN OTHERS THEN caught:=true;
 END;
 IF NOT caught THEN RAISE EXCEPTION 'Reception with undecided item was confirmed'; END IF;
 UPDATE public.obras_recepcoes
 SET pendencias='[{"id":"ocorrencia:1","origem":"ocorrencia","origem_id":"00000000-0000-0000-0000-000000000001","titulo":"Pendência","decisao":"reserva_aceite","justificacao":""}]'::jsonb;
 caught:=false;
 BEGIN
  UPDATE public.obras_recepcoes SET estado='recebida_com_reservas' WHERE id='e4500000-0000-4000-8000-000000000001';
 EXCEPTION WHEN OTHERS THEN caught:=true;
 END;
 IF NOT caught THEN RAISE EXCEPTION 'Reservation without justification was accepted'; END IF;
END $$ $test$, 'reception cannot be confirmed with unresolved items or unjustified reservations');

-- A justified reservation is accepted and stamps actor and time.
SELECT extensions.lives_ok($test$ DO $$
DECLARE row_data public.obras_recepcoes;
BEGIN
 UPDATE public.obras_recepcoes
 SET pendencias='[{"id":"ocorrencia:1","origem":"ocorrencia","origem_id":"00000000-0000-0000-0000-000000000001","titulo":"Pendência","decisao":"reserva_aceite","justificacao":"Correcção acordada para a próxima semana"}]'::jsonb,
     estado='recebida_com_reservas'
 WHERE id='e4500000-0000-4000-8000-000000000001';
 SELECT * INTO row_data FROM public.obras_recepcoes WHERE id='e4500000-0000-4000-8000-000000000001';
 IF row_data.recebido_em IS NULL OR row_data.recebido_por <> auth.uid() THEN
   RAISE EXCEPTION 'Reception actor/time were not stamped';
 END IF;
END $$ $test$, 'justified reservations are accepted and actor/time are recorded');

-- A document from another work is rejected; only one reception can exist per work.
SELECT extensions.lives_ok($test$ DO $$
DECLARE caught boolean;
BEGIN
 caught:=false;
 BEGIN
  UPDATE public.obras_recepcoes SET documentos_ids=ARRAY['d4500000-0000-4000-8000-000000000002']::uuid[]
  WHERE id='e4500000-0000-4000-8000-000000000001';
 EXCEPTION WHEN OTHERS THEN caught:=true;
 END;
 IF NOT caught THEN RAISE EXCEPTION 'Cross-work document association was accepted'; END IF;
 caught:=false;
 BEGIN
  INSERT INTO public.obras_recepcoes(workspace_id,obra_id,created_by)
  VALUES('b4500000-0000-4000-8000-000000000001','c4500000-0000-4000-8000-000000000001',auth.uid());
 EXCEPTION WHEN unique_violation THEN caught:=true;
 END;
 IF NOT caught THEN RAISE EXCEPTION 'A second reception was created for the same work'; END IF;
END $$ $test$, 'documents cannot cross workspaces and a work has only one reception');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a4500000-0000-4000-8000-000000000003',true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE caught boolean:=false; n integer;
BEGIN
 SELECT count(*) INTO n FROM public.obras_recepcoes WHERE obra_id='c4500000-0000-4000-8000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'Viewer cannot read reception'; END IF;
 BEGIN
  UPDATE public.obras_recepcoes SET notas='viewer edit' WHERE obra_id='c4500000-0000-4000-8000-000000000001';
 EXCEPTION WHEN insufficient_privilege THEN caught:=true;
 END;
 IF NOT caught THEN RAISE EXCEPTION 'Viewer unexpectedly edited reception'; END IF;
END $$ $test$, 'viewer can read but cannot edit the reception');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

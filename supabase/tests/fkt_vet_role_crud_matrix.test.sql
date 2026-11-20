-- Behavioural CRUD matrix for workspace owners, admins and editors.
-- Each role exercises SELECT/INSERT/UPDATE/DELETE on all five Vet tables.
-- Fixtures are isolated to this transaction and rolled back.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'fkt-vet-owner-a@example.test', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'fkt-vet-editor-a@example.test', now(), now()),
  ('a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'fkt-vet-admin-a@example.test', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspaces (id, user_id, modulo, name)
VALUES ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','canil','FKT Vet CRUD matrix workspace')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES
 ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000004','editor'),
 ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000005','admin')
ON CONFLICT (workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role;

SELECT plan(3);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _count integer;
BEGIN
  INSERT INTO public.canil_animais (id, workspace_id, nome, sexo)
  VALUES ('11000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','CRUD workspace owner','macho');

  INSERT INTO public.canil_ninhadas (id, workspace_id, observacoes)
  VALUES ('11000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','CRUD workspace owner');

  INSERT INTO public.canil_cachorros (id, ninhada_id, estado)
  VALUES ('11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000002','disponivel');

  INSERT INTO public.canil_registos_clinicos
    (id, workspace_id, animal_id, tipo, data_registo, descricao)
  VALUES ('11000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','consulta',current_date,'antes');

  INSERT INTO public.canil_reservas
    (id, workspace_id, animal_id, data_entrada, data_saida, estado, pago, observacoes_estadia)
  VALUES ('11000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001',current_date,current_date + 1,'confirmada',false,'antes');

  SELECT count(*) INTO _count FROM public.canil_animais WHERE id='11000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot SELECT animal'; END IF;
  SELECT count(*) INTO _count FROM public.canil_ninhadas WHERE id='11000000-0000-4000-8000-000000000002';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot SELECT litter'; END IF;
  SELECT count(*) INTO _count FROM public.canil_cachorros WHERE id='11000000-0000-4000-8000-000000000003';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot SELECT puppy'; END IF;
  SELECT count(*) INTO _count FROM public.canil_registos_clinicos WHERE id='11000000-0000-4000-8000-000000000004';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot SELECT clinical record'; END IF;
  SELECT count(*) INTO _count FROM public.canil_reservas WHERE id='11000000-0000-4000-8000-000000000005';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot SELECT reservation'; END IF;

  UPDATE public.canil_animais SET nome='depois' WHERE id='11000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot UPDATE animal'; END IF;
  UPDATE public.canil_ninhadas SET observacoes='depois' WHERE id='11000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot UPDATE litter'; END IF;
  UPDATE public.canil_cachorros SET estado='reservado' WHERE id='11000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot UPDATE puppy'; END IF;
  UPDATE public.canil_registos_clinicos SET descricao='depois' WHERE id='11000000-0000-4000-8000-000000000004';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot UPDATE clinical record'; END IF;
  UPDATE public.canil_reservas SET observacoes_estadia='depois' WHERE id='11000000-0000-4000-8000-000000000005';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot UPDATE reservation'; END IF;

  DELETE FROM public.canil_registos_clinicos WHERE id='11000000-0000-4000-8000-000000000004';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot DELETE clinical record'; END IF;
  DELETE FROM public.canil_reservas WHERE id='11000000-0000-4000-8000-000000000005';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot DELETE reservation'; END IF;
  DELETE FROM public.canil_cachorros WHERE id='11000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot DELETE puppy'; END IF;
  DELETE FROM public.canil_ninhadas WHERE id='11000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot DELETE litter'; END IF;
  DELETE FROM public.canil_animais WHERE id='11000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace owner: cannot DELETE animal'; END IF;
END;
$$ $test$, 'workspace owner can SELECT, INSERT, UPDATE and DELETE in all five FKT Vet tables');
RESET ROLE;


SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000005', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _count integer;
BEGIN
  INSERT INTO public.canil_animais (id, workspace_id, nome, sexo)
  VALUES ('12000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','CRUD workspace admin','macho');

  INSERT INTO public.canil_ninhadas (id, workspace_id, observacoes)
  VALUES ('12000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','CRUD workspace admin');

  INSERT INTO public.canil_cachorros (id, ninhada_id, estado)
  VALUES ('12000000-0000-4000-8000-000000000003','12000000-0000-4000-8000-000000000002','disponivel');

  INSERT INTO public.canil_registos_clinicos
    (id, workspace_id, animal_id, tipo, data_registo, descricao)
  VALUES ('12000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','consulta',current_date,'antes');

  INSERT INTO public.canil_reservas
    (id, workspace_id, animal_id, data_entrada, data_saida, estado, pago, observacoes_estadia)
  VALUES ('12000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001',current_date,current_date + 1,'confirmada',false,'antes');

  SELECT count(*) INTO _count FROM public.canil_animais WHERE id='12000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot SELECT animal'; END IF;
  SELECT count(*) INTO _count FROM public.canil_ninhadas WHERE id='12000000-0000-4000-8000-000000000002';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot SELECT litter'; END IF;
  SELECT count(*) INTO _count FROM public.canil_cachorros WHERE id='12000000-0000-4000-8000-000000000003';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot SELECT puppy'; END IF;
  SELECT count(*) INTO _count FROM public.canil_registos_clinicos WHERE id='12000000-0000-4000-8000-000000000004';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot SELECT clinical record'; END IF;
  SELECT count(*) INTO _count FROM public.canil_reservas WHERE id='12000000-0000-4000-8000-000000000005';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot SELECT reservation'; END IF;

  UPDATE public.canil_animais SET nome='depois' WHERE id='12000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot UPDATE animal'; END IF;
  UPDATE public.canil_ninhadas SET observacoes='depois' WHERE id='12000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot UPDATE litter'; END IF;
  UPDATE public.canil_cachorros SET estado='reservado' WHERE id='12000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot UPDATE puppy'; END IF;
  UPDATE public.canil_registos_clinicos SET descricao='depois' WHERE id='12000000-0000-4000-8000-000000000004';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot UPDATE clinical record'; END IF;
  UPDATE public.canil_reservas SET observacoes_estadia='depois' WHERE id='12000000-0000-4000-8000-000000000005';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot UPDATE reservation'; END IF;

  DELETE FROM public.canil_registos_clinicos WHERE id='12000000-0000-4000-8000-000000000004';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot DELETE clinical record'; END IF;
  DELETE FROM public.canil_reservas WHERE id='12000000-0000-4000-8000-000000000005';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot DELETE reservation'; END IF;
  DELETE FROM public.canil_cachorros WHERE id='12000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot DELETE puppy'; END IF;
  DELETE FROM public.canil_ninhadas WHERE id='12000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot DELETE litter'; END IF;
  DELETE FROM public.canil_animais WHERE id='12000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace admin: cannot DELETE animal'; END IF;
END;
$$ $test$, 'workspace admin can SELECT, INSERT, UPDATE and DELETE in all five FKT Vet tables');
RESET ROLE;


SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _count integer;
BEGIN
  INSERT INTO public.canil_animais (id, workspace_id, nome, sexo)
  VALUES ('13000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','CRUD workspace editor','macho');

  INSERT INTO public.canil_ninhadas (id, workspace_id, observacoes)
  VALUES ('13000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','CRUD workspace editor');

  INSERT INTO public.canil_cachorros (id, ninhada_id, estado)
  VALUES ('13000000-0000-4000-8000-000000000003','13000000-0000-4000-8000-000000000002','disponivel');

  INSERT INTO public.canil_registos_clinicos
    (id, workspace_id, animal_id, tipo, data_registo, descricao)
  VALUES ('13000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','consulta',current_date,'antes');

  INSERT INTO public.canil_reservas
    (id, workspace_id, animal_id, data_entrada, data_saida, estado, pago, observacoes_estadia)
  VALUES ('13000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001',current_date,current_date + 1,'confirmada',false,'antes');

  SELECT count(*) INTO _count FROM public.canil_animais WHERE id='13000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot SELECT animal'; END IF;
  SELECT count(*) INTO _count FROM public.canil_ninhadas WHERE id='13000000-0000-4000-8000-000000000002';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot SELECT litter'; END IF;
  SELECT count(*) INTO _count FROM public.canil_cachorros WHERE id='13000000-0000-4000-8000-000000000003';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot SELECT puppy'; END IF;
  SELECT count(*) INTO _count FROM public.canil_registos_clinicos WHERE id='13000000-0000-4000-8000-000000000004';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot SELECT clinical record'; END IF;
  SELECT count(*) INTO _count FROM public.canil_reservas WHERE id='13000000-0000-4000-8000-000000000005';
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot SELECT reservation'; END IF;

  UPDATE public.canil_animais SET nome='depois' WHERE id='13000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot UPDATE animal'; END IF;
  UPDATE public.canil_ninhadas SET observacoes='depois' WHERE id='13000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot UPDATE litter'; END IF;
  UPDATE public.canil_cachorros SET estado='reservado' WHERE id='13000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot UPDATE puppy'; END IF;
  UPDATE public.canil_registos_clinicos SET descricao='depois' WHERE id='13000000-0000-4000-8000-000000000004';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot UPDATE clinical record'; END IF;
  UPDATE public.canil_reservas SET observacoes_estadia='depois' WHERE id='13000000-0000-4000-8000-000000000005';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot UPDATE reservation'; END IF;

  DELETE FROM public.canil_registos_clinicos WHERE id='13000000-0000-4000-8000-000000000004';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot DELETE clinical record'; END IF;
  DELETE FROM public.canil_reservas WHERE id='13000000-0000-4000-8000-000000000005';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot DELETE reservation'; END IF;
  DELETE FROM public.canil_cachorros WHERE id='13000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot DELETE puppy'; END IF;
  DELETE FROM public.canil_ninhadas WHERE id='13000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot DELETE litter'; END IF;
  DELETE FROM public.canil_animais WHERE id='13000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'workspace editor: cannot DELETE animal'; END IF;
END;
$$ $test$, 'workspace editor can SELECT, INSERT, UPDATE and DELETE in all five FKT Vet tables');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

-- Behavioural RLS and integrity tests for FKT Vet.
-- Run only against the local Supabase test database after migrations:
--   supabase db reset
--   supabase test db
-- All fixtures are rolled back. No production records are touched.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'fkt-vet-owner-a@example.test', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'fkt-vet-owner-b@example.test', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'fkt-vet-viewer-a@example.test', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'fkt-vet-editor-a@example.test', now(), now()),
  ('a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'fkt-vet-admin-a@example.test', now(), now());

INSERT INTO public.workspaces (id, user_id, modulo, name)
VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'canil', 'FKT Vet test workspace A'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'canil', 'FKT Vet test workspace B');

INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'viewer'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'editor'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'admin');

INSERT INTO public.canil_animais (id, workspace_id, nome, sexo)
VALUES
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Animal A', 'femea'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Progenitor A', 'macho'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'Animal B', 'femea');

INSERT INTO public.canil_ninhadas (id, workspace_id, mae_id, pai_id)
VALUES (
  'd0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002'
);

INSERT INTO public.canil_cachorros (id, ninhada_id, estado)
VALUES (
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'disponivel'
);

INSERT INTO public.canil_registos_clinicos
  (id, workspace_id, animal_id, tipo, data_registo)
VALUES (
  'e0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'consulta',
  current_date
);

INSERT INTO public.canil_reservas
  (id, workspace_id, animal_id, data_entrada, data_saida, estado, pago)
VALUES (
  'f0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  current_date,
  current_date + 1,
  'confirmada',
  false
);

SELECT plan(5);

-- Viewer: read access inside workspace A, no visibility of B, no writes.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _count integer;
BEGIN
  SELECT count(*) INTO _count FROM public.canil_animais
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Viewer should read workspace A'; END IF;

  SELECT count(*) INTO _count FROM public.canil_animais
  WHERE id = 'c0000000-0000-4000-8000-000000000003';
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not read workspace B'; END IF;

  UPDATE public.canil_animais SET nome = 'Viewer changed this'
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not update animals'; END IF;

  DELETE FROM public.canil_animais
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not delete animals'; END IF;

  BEGIN
    INSERT INTO public.canil_animais (workspace_id, nome, sexo)
    VALUES ('b0000000-0000-4000-8000-000000000001', 'Viewer insert', 'macho');
    RAISE EXCEPTION 'Viewer INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.canil_cachorros (ninhada_id, estado)
    VALUES ('d0000000-0000-4000-8000-000000000001', 'disponivel');
    RAISE EXCEPTION 'Viewer puppy INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Viewer must not see or mutate any Vet record in another workspace.
  SELECT count(*) INTO _count FROM public.canil_ninhadas
  WHERE id = 'd0000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Viewer should read its own litter'; END IF;

  SELECT count(*) INTO _count FROM public.canil_registos_clinicos
  WHERE id = 'e0000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Viewer should read its own clinical records'; END IF;

  SELECT count(*) INTO _count FROM public.canil_reservas
  WHERE id = 'f0000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Viewer should read its own reservations'; END IF;

  SELECT count(*) INTO _count FROM public.canil_cachorros
  WHERE id = 'd1000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Viewer should read its own puppies'; END IF;

  SELECT count(*) INTO _count FROM public.canil_ninhadas n
  WHERE n.workspace_id = 'b0000000-0000-4000-8000-000000000002';
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not read litters in workspace B'; END IF;

  SELECT count(*) INTO _count FROM public.canil_registos_clinicos r
  WHERE r.workspace_id = 'b0000000-0000-4000-8000-000000000002';
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not read clinical records in workspace B'; END IF;

  SELECT count(*) INTO _count FROM public.canil_reservas r
  WHERE r.workspace_id = 'b0000000-0000-4000-8000-000000000002';
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not read reservations in workspace B'; END IF;

  UPDATE public.canil_ninhadas SET observacoes = 'viewer update'
  WHERE id = 'd0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not update litters'; END IF;

  UPDATE public.canil_registos_clinicos SET descricao = 'viewer update'
  WHERE id = 'e0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not update clinical records'; END IF;

  UPDATE public.canil_reservas SET observacoes_estadia = 'viewer update'
  WHERE id = 'f0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not update reservations'; END IF;

  DELETE FROM public.canil_ninhadas WHERE id = 'd0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not delete litters'; END IF;

  DELETE FROM public.canil_registos_clinicos WHERE id = 'e0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not delete clinical records'; END IF;

  DELETE FROM public.canil_reservas WHERE id = 'f0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not delete reservations'; END IF;

  UPDATE public.canil_cachorros SET estado = 'reservado'
  WHERE id = 'd1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not update puppies'; END IF;

  DELETE FROM public.canil_cachorros
  WHERE id = 'd1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 0 THEN RAISE EXCEPTION 'Viewer must not delete puppies'; END IF;

  BEGIN
    INSERT INTO public.canil_ninhadas (workspace_id, mae_id)
    VALUES ('b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Viewer litter INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.canil_registos_clinicos (workspace_id, animal_id, tipo, data_registo)
    VALUES ('b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','consulta',current_date);
    RAISE EXCEPTION 'Viewer clinical INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.canil_reservas (workspace_id, animal_id, data_entrada, data_saida, estado, pago)
    VALUES ('b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',current_date,current_date + 1,'confirmada',false);
    RAISE EXCEPTION 'Viewer reservation INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$ $test$, 'viewer reads only its own workspace and cannot write');
RESET ROLE;

-- Workspace B owner cannot read A, but workspace A owner can manage its data.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE _count integer;
BEGIN
  SELECT count(*) INTO _count FROM public.canil_animais
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  IF _count <> 0 THEN RAISE EXCEPTION 'Workspace B owner must not read workspace A'; END IF;
END;
$$ $test$, 'workspace B owner cannot read workspace A');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE _count integer;
BEGIN
  UPDATE public.canil_animais SET nome = 'Owner managed'
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'Workspace owner must update animals'; END IF;
END;
$$ $test$, 'workspace A owner can manage workspace A');
RESET ROLE;

-- Editor: allowed to create within A; cannot cross-reference B or move records.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _count integer;
  _caught boolean := false;
BEGIN
  INSERT INTO public.canil_animais (workspace_id, nome, sexo)
  VALUES ('b0000000-0000-4000-8000-000000000001', 'Editor created', 'macho');

  BEGIN
    INSERT INTO public.canil_registos_clinicos
      (workspace_id, animal_id, tipo, data_registo)
    VALUES (
      'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000003',
      'consulta',
      current_date
    );
    RAISE EXCEPTION 'Cross-workspace clinical reference unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Cross-workspace clinical reference was not rejected'; END IF;

  _caught := false;
  BEGIN
    INSERT INTO public.canil_cachorros (ninhada_id, animal_id, estado)
    VALUES (
      'd0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000003',
      'disponivel'
    );
    RAISE EXCEPTION 'Cross-workspace puppy/animal reference unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Cross-workspace puppy/animal reference was not rejected'; END IF;

  _caught := false;
  BEGIN
    INSERT INTO public.canil_ninhadas (workspace_id, mae_id)
    VALUES (
      'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000003'
    );
    RAISE EXCEPTION 'Cross-workspace parent/litter reference unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Cross-workspace parent/litter reference was not rejected'; END IF;

  _caught := false;
  BEGIN
    INSERT INTO public.canil_reservas
      (workspace_id, animal_id, data_entrada, data_saida, estado, pago)
    VALUES (
      'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000003',
      current_date,
      current_date + 1,
      'confirmada',
      false
    );
    RAISE EXCEPTION 'Cross-workspace reservation reference unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Cross-workspace reservation reference was not rejected'; END IF;

  -- A valid puppy insert omits workspace_id; the database derives it from the litter.
  INSERT INTO public.canil_cachorros (ninhada_id, estado)
  VALUES (
    'd0000000-0000-4000-8000-000000000001',
    'disponivel'
  );
  SELECT count(*) INTO _count FROM public.canil_cachorros
  WHERE ninhada_id = 'd0000000-0000-4000-8000-000000000001'
    AND workspace_id = 'b0000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Puppy workspace was not derived from its litter'; END IF;

  _caught := false;
  BEGIN
    UPDATE public.canil_animais
    SET workspace_id = 'b0000000-0000-4000-8000-000000000002'
    WHERE id = 'c0000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Animal workspace reassignment unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    -- The trigger raises a controlled exception; the deliberate assertion above
    -- uses the same SQLSTATE, so distinguish it by checking the persisted value.
    SELECT count(*) INTO _count FROM public.canil_animais
    WHERE id = 'c0000000-0000-4000-8000-000000000001'
      AND workspace_id = 'b0000000-0000-4000-8000-000000000001';
    IF _count <> 1 THEN RAISE; END IF;
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Animal workspace reassignment was not rejected'; END IF;

  _caught := false;
  BEGIN
    DELETE FROM public.canil_animais
    WHERE id = 'c0000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Animal with history was physically deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Animal history deletion was not blocked'; END IF;

  -- A litter that records parents is breeding history and cannot be deleted
  -- to bypass the animal's descendant-preservation rule.
  _caught := false;
  BEGIN
    DELETE FROM public.canil_ninhadas
    WHERE id = 'd0000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Litter with recorded parents was unexpectedly deleted';
  EXCEPTION WHEN raise_exception THEN
    SELECT count(*) INTO _count FROM public.canil_ninhadas
    WHERE id = 'd0000000-0000-4000-8000-000000000001';
    IF _count <> 1 THEN RAISE; END IF;
    _caught := true;
  END;
  IF NOT _caught THEN RAISE EXCEPTION 'Litter history deletion was not blocked'; END IF;

  -- Logical archive is permitted and leaves all historical relations intact.
  UPDATE public.canil_animais SET activo = false
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'Editor should be able to archive animal'; END IF;

  SELECT count(*) INTO _count FROM public.canil_registos_clinicos
  WHERE animal_id = 'c0000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Clinical history was not preserved after archive'; END IF;

  SELECT count(*) INTO _count FROM public.canil_reservas
  WHERE animal_id = 'c0000000-0000-4000-8000-000000000001';
  IF _count <> 1 THEN RAISE EXCEPTION 'Reservations were not preserved after archive'; END IF;
END;
$$ $test$, 'editor cannot cross workspace references and can archive without losing history');
RESET ROLE;

-- Admin: write access in its workspace; viewer/editor/admin permissions are
-- separately asserted so future policy changes cannot silently broaden viewer.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000005', true);
SELECT extensions.lives_ok($test$ DO $$
DECLARE _count integer;
BEGIN
  INSERT INTO public.canil_animais (workspace_id, nome, sexo)
  VALUES ('b0000000-0000-4000-8000-000000000001', 'Admin created', 'femea');
  GET DIAGNOSTICS _count = ROW_COUNT;
  IF _count <> 1 THEN RAISE EXCEPTION 'Admin must be able to create animals'; END IF;
END;
$$ $test$, 'admin can create records in its workspace');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

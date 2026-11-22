-- Issue #40: regression checks for action task communication and integrity.
-- Run after applying migrations with: supabase test db

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _table text;
  _policy record;
BEGIN
  FOREACH _table IN ARRAY ARRAY['obras_acoes_comentarios','obras_acoes_anexos'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=_table AND c.relrowsecurity
    ) THEN RAISE EXCEPTION 'RLS não está activo em public.%', _table; END IF;
    IF has_table_privilege('anon', format('public.%I',_table), 'SELECT')
      OR has_table_privilege('anon', format('public.%I',_table), 'INSERT') THEN
      RAISE EXCEPTION 'anon tem privilégios em public.%', _table;
    END IF;
    SELECT * INTO _policy FROM pg_policies
      WHERE schemaname='public' AND tablename=_table AND cmd='SELECT'
        AND 'authenticated'=ANY(roles);
    IF NOT FOUND OR position('obras_can_read' in lower(coalesce(_policy.qual,'')))=0 THEN
      RAISE EXCEPTION 'Falta política SELECT limitada ao workspace em public.%', _table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.obras_acoes'::regclass
      AND tgname='obras_acoes_validar_responsavel' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'Falta validação de responsável na tabela de acções'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.obras_acoes'::regclass
      AND conname='obras_acoes_visita_context_fk'
  ) THEN RAISE EXCEPTION 'A visita de origem não está limitada à mesma obra e workspace'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.obras_acoes'::regclass
      AND conname='obras_acoes_estado_check'
      AND pg_get_constraintdef(oid) LIKE '%bloqueada%'
      AND pg_get_constraintdef(oid) LIKE '%cancelada%'
  ) THEN RAISE EXCEPTION 'Estados de bloqueio e cancelamento não estão permitidos'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.obras_acoes_comentarios'::regclass
      AND tgname='obras_acoes_comentarios_historico' AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.obras_acoes_anexos'::regclass
      AND tgname='obras_acoes_anexos_historico' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'Comentários e anexos não alimentam o histórico'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.obras_acoes_comentarios'::regclass
      AND tgname='obras_acoes_comentario_notificacao' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'Falta notificação interna de comentários'; END IF;

  IF NOT has_table_privilege('authenticated','public.obras_acoes_comentarios','SELECT')
    OR NOT has_table_privilege('authenticated','public.obras_acoes_comentarios','INSERT')
    OR has_table_privilege('authenticated','public.obras_acoes_comentarios','UPDATE')
    OR has_table_privilege('authenticated','public.obras_acoes_comentarios','DELETE') THEN
    RAISE EXCEPTION 'Privilégios de comentários não respeitam SELECT/INSERT apenas'; END IF;

  IF position(`cancelada` in lower(pg_get_functiondef(
    'public.sincronizar_alertas_obras_acoes()'::regprocedure
  ))) = 0 THEN
    RAISE EXCEPTION 'A sincronização de alertas não exclui acções canceladas'; END IF;
END;
$$ $test$, 'FKT Works actions enforce workspace isolation, traceability and communication');

SELECT * FROM finish();
ROLLBACK;

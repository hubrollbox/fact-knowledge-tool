-- Issue #44: Works activity planning schema and workspace security.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);
SELECT extensions.lives_ok($test$ DO $$
DECLARE _table text;
BEGIN
 FOREACH _table IN ARRAY ARRAY['obras_actividades','obras_actividades_dependencias'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=_table AND c.relrowsecurity) THEN
   RAISE EXCEPTION 'RLS não está activo em public.%',_table;
  END IF;
  IF has_table_privilege('anon',format('public.%I',_table),'SELECT') OR has_table_privilege('anon',format('public.%I',_table),'INSERT') OR has_table_privilege('anon',format('public.%I',_table),'UPDATE') OR has_table_privilege('anon',format('public.%I',_table),'DELETE') THEN
   RAISE EXCEPTION 'anon tem privilégios directos em public.%',_table;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=_table AND cmd='SELECT' AND 'authenticated'=ANY(roles) AND position('obras_can_read' in lower(coalesce(qual,'')))>0) THEN
   RAISE EXCEPTION 'Falta SELECT limitado ao workspace em public.%',_table;
  END IF;
 END LOOP;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.obras_actividades'::regclass AND tgname='obras_actividades_validar' AND NOT tgisinternal) THEN RAISE EXCEPTION 'Falta validação de actividade'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.obras_actividades_dependencias'::regclass AND tgname='obras_actividades_dependencias_validar' AND NOT tgisinternal) THEN RAISE EXCEPTION 'Falta validação de ciclos nas dependências'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.obras_actividades_dependencias'::regclass AND conname='obras_actividades_dependencias_activity_fk')
 OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.obras_actividades_dependencias'::regclass AND conname='obras_actividades_dependencias_predecessor_fk') THEN RAISE EXCEPTION 'As dependências não estão limitadas à mesma obra/workspace'; END IF;
 IF NOT has_table_privilege('authenticated','public.obras_actividades','SELECT') OR NOT has_table_privilege('authenticated','public.obras_actividades','INSERT') OR NOT has_table_privilege('authenticated','public.obras_actividades','UPDATE') OR NOT has_table_privilege('authenticated','public.obras_actividades','DELETE') THEN RAISE EXCEPTION 'Permissões de actividade incompletas'; END IF;
 IF has_table_privilege('authenticated','public.obras_actividades_dependencias','UPDATE') OR has_table_privilege('authenticated','public.obras_actividades_dependencias','TRUNCATE') THEN RAISE EXCEPTION 'Privilégios excessivos em dependências'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.definir_dependencias_obras_actividade(uuid,uuid[])'::regprocedure) THEN RAISE EXCEPTION 'RPC de dependências não pode ser SECURITY DEFINER'; END IF;
 IF position('ciclo' in lower(pg_get_functiondef('private.validar_obras_actividade_dependencia()'::regprocedure)))=0 THEN RAISE EXCEPTION 'A função de dependências não rejeita ciclos'; END IF;
END;
$$ $test$, 'FKT Works planning enforces workspace isolation, dependency integrity and least privilege');
SELECT * FROM finish();
ROLLBACK;

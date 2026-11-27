-- Issue #133: security regression checks for exposed RPCs.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _signature text;
  _fn regprocedure;
BEGIN
  FOREACH _signature IN ARRAY ARRAY[
    'public.create_application_with_factos(uuid,uuid,uuid,text,text,uuid[])',
    'public.create_juridico_conclusao_version(uuid,uuid,uuid,uuid,text,text)',
    'public.emitir_relatorio_visita(uuid,jsonb)',
    'public.sincronizar_alertas_obras_acoes()',
    'public.transition_juridico_conclusao(uuid,text,text)'
  ] LOOP
    _fn := _signature::regprocedure;
    IF NOT (SELECT prosecdef FROM pg_proc WHERE oid=_fn) THEN
      RAISE EXCEPTION 'A RPC % deixou de ser SECURITY DEFINER sem revisão das permissões de escrita', _signature;
    END IF;
    IF NOT has_function_privilege('authenticated', _fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated perdeu EXECUTE em %', _signature;
    END IF;
    IF has_function_privilege('anon', _fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon mantém EXECUTE em %', _signature;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      WHERE p.oid=_fn
        AND coalesce(p.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']
    ) THEN
      RAISE EXCEPTION 'A RPC % não tem search_path vazio', _signature;
    END IF;
  END LOOP;
END;
$$ $test$, 'All exposed SECURITY DEFINER RPCs have a fixed search_path and least-privilege EXECUTE grants');

SELECT * FROM finish();
ROLLBACK;

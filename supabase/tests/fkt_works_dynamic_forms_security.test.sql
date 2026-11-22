-- FKT Works dynamic forms: schema, immutability, RLS and grants regression checks.
-- Run after applying migrations with: supabase test db

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _table text;
  _command text;
  _policy record;
  _tables text[] := ARRAY[
    'obras_formularios',
    'obras_formularios_versoes',
    'obras_formularios_respostas'
  ];
  _commands text[] := ARRAY['SELECT'];
BEGIN
  FOREACH _table IN ARRAY _tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = _table AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS não está activo em public.%', _table;
    END IF;
    IF has_table_privilege('anon', format('public.%I', _table), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', _table), 'INSERT')
      OR has_table_privilege('anon', format('public.%I', _table), 'UPDATE')
      OR has_table_privilege('anon', format('public.%I', _table), 'DELETE') THEN
      RAISE EXCEPTION 'anon mantém privilégios directos em public.%', _table;
    END IF;
    SELECT * INTO _policy
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = _table
      AND cmd = 'SELECT' AND 'authenticated' = ANY(roles);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Falta política SELECT autenticada em public.%', _table;
    END IF;
    IF position('obras_can_read' in lower(coalesce(_policy.qual, ''))) = 0 THEN
      RAISE EXCEPTION 'A política SELECT de public.% não usa a autorização do workspace', _table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.obras_formularios_versoes'::regclass
      AND tgname = 'obras_formularios_versoes_immutable' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Falta protecção de imutabilidade das versões';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.obras_formularios_respostas'::regclass
      AND tgname = 'obras_formularios_respostas_protect' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Falta protecção das respostas concluídas';
  END IF;

  IF has_table_privilege('authenticated', 'public.obras_formularios_versoes', 'INSERT')
    OR has_table_privilege('authenticated', 'public.obras_formularios_versoes', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.obras_formularios_versoes', 'DELETE') THEN
    RAISE EXCEPTION 'As versões só podem ser criadas pela função de publicação';
  END IF;
  IF has_table_privilege('authenticated', 'public.obras_formularios_respostas', 'INSERT')
    OR has_table_privilege('authenticated', 'public.obras_formularios_respostas', 'DELETE') THEN
    RAISE EXCEPTION 'As respostas só podem ser criadas pela função autorizada e não podem ser apagadas directamente';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.obras_formularios', 'draft_definicao', 'INSERT')
    OR NOT has_column_privilege('authenticated', 'public.obras_formularios', 'draft_definicao', 'UPDATE') THEN
    RAISE EXCEPTION 'A definição de rascunho não tem privilégios de escrita necessários';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'obras_formularios'
      AND policyname = 'obras_formularios_insert'
      AND cmd = 'INSERT' AND with_check LIKE '%obras_can_write%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'obras_formularios'
      AND policyname = 'obras_formularios_update'
      AND cmd = 'UPDATE' AND with_check LIKE '%obras_can_write%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'obras_formularios_respostas'
      AND policyname = 'obras_formularios_respostas_update'
      AND cmd = 'UPDATE' AND with_check LIKE '%obras_can_write%'
  ) THEN
    RAISE EXCEPTION 'As políticas de escrita não aplicam a autorização por workspace em WITH CHECK';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname = 'public' AND p.proname IN (
      'publicar_obras_formulario',
      'criar_obras_formulario_resposta',
      'concluir_obras_formulario_resposta'
    )) AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'As funções públicas RPC não podem executar como SECURITY DEFINER';
  END IF;
  IF (SELECT count(*) FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'private_works_forms'
        AND p.proname IN (
          'obras_publicar_formulario_privileged',
          'obras_publicar_formulario_draft_privileged',
          'obras_criar_formulario_resposta_privileged',
          'obras_concluir_formulario_resposta_privileged'
        ) AND p.prosecdef) <> 4 THEN
    RAISE EXCEPTION 'As quatro rotinas privilegiadas devem estar isoladas no schema dedicado';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.publicar_obras_formulario(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.criar_obras_formulario_resposta(uuid,uuid,uuid,uuid)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.concluir_obras_formulario_resposta(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Faltam permissões de execução nas funções do fluxo de formulários';
  END IF;

  IF to_regprocedure('public.publicar_obras_formulario(uuid,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'A assinatura antiga que aceitava uma definição arbitrária continua exposta';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'publicar_obras_formulario'
      AND p.prosecdef = false
      AND pg_get_function_identity_arguments(p.oid) = 'p_formulario_id uuid'
  ) THEN
    RAISE EXCEPTION 'A RPC pública de publicação tem de permanecer SECURITY INVOKER e aceitar apenas o ID do modelo';
  END IF;

  IF has_function_privilege('authenticated', 'private_works_forms.obras_publicar_formulario_privileged(uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated não pode chamar o helper que publica definições arbitrárias';
  END IF;
  IF NOT has_function_privilege('authenticated', 'private_works_forms.obras_publicar_formulario_draft_privileged(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated não consegue publicar o rascunho guardado através do wrapper seguro';
  END IF;
END;
$$ $test$, 'FKT Works forms enforce workspace RLS, immutable versions and controlled response lifecycle');

SELECT * FROM finish();
ROLLBACK;

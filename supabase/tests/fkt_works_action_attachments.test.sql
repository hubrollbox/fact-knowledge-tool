-- Issue #118: secure upload and atomic association of task attachments.
-- Run after applying the Works task communication and attachment migrations.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _security_definer boolean;
  _bucket record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='obras_acoes_anexos' AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'RLS não está activo em obras_acoes_anexos'; END IF;

  IF NOT has_table_privilege('authenticated','public.obras_acoes_anexos','SELECT')
    OR NOT has_table_privilege('authenticated','public.obras_acoes_anexos','INSERT')
    OR has_table_privilege('authenticated','public.obras_acoes_anexos','UPDATE') THEN
    RAISE EXCEPTION 'Privilégios da tabela de anexos não respeitam o modelo esperado';
  END IF;

  IF has_table_privilege('anon','public.obras_acoes_anexos','SELECT')
    OR has_table_privilege('anon','public.obras_acoes_anexos','INSERT') THEN
    RAISE EXCEPTION 'anon tem acesso à tabela de anexos';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.create_obras_acao_anexo(uuid,uuid,uuid,text,text,text,bigint)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.create_obras_acao_anexo(uuid,uuid,uuid,text,text,text,bigint)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Permissões de execução da função de anexos incorrectas';
  END IF;

  SELECT p.prosecdef INTO _security_definer
  FROM pg_proc p
  WHERE p.oid = 'public.create_obras_acao_anexo(uuid,uuid,uuid,text,text,text,bigint)'::regprocedure;
  IF _security_definer THEN
    RAISE EXCEPTION 'A função de anexos não pode ser SECURITY DEFINER';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='obras_acoes_anexos'
      AND cmd='SELECT' AND 'authenticated'=ANY(roles)
      AND position('obras_can_read' in lower(coalesce(qual,''))) > 0
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='obras_acoes_anexos'
      AND cmd='INSERT' AND 'authenticated'=ANY(roles)
      AND position('obras_can_write' in lower(coalesce(with_check,''))) > 0
  ) THEN
    RAISE EXCEPTION 'Políticas RLS de anexos não limitam leitura e escrita ao workspace';
  END IF;

  SELECT public, file_size_limit, allowed_mime_types
    INTO _bucket
  FROM storage.buckets WHERE id='obras-documentos';
  IF NOT FOUND OR _bucket.public OR _bucket.file_size_limit <> 26214400
    OR NOT ('application/pdf'=ANY(_bucket.allowed_mime_types))
    OR NOT ('image/png'=ANY(_bucket.allowed_mime_types)) THEN
    RAISE EXCEPTION 'O bucket privado de documentos não respeita os limites esperados';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.obras_acoes_anexos'::regclass
      AND conname='obras_acoes_anexos_document_fk'
  ) THEN RAISE EXCEPTION 'Falta a relação composta entre anexo e versão documental'; END IF;
END;
$$ $test$, 'FKT Works attachments are private, workspace-scoped and atomically linked');

SELECT * FROM finish();
ROLLBACK;

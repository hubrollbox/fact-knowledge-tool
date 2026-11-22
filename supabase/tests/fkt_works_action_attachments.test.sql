-- Issue #118: server-validated, private task attachments.
-- Run after the Works task communication and secure-upload migrations.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(1);

SELECT extensions.lives_ok($test$ DO $$
DECLARE
  _bucket record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='obras_acoes_anexos' AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'RLS não está activo em obras_acoes_anexos'; END IF;

  IF NOT has_table_privilege('authenticated','public.obras_acoes_anexos','SELECT')
    OR has_table_privilege('authenticated','public.obras_acoes_anexos','INSERT')
    OR has_table_privilege('authenticated','public.obras_acoes_anexos','UPDATE')
    OR has_table_privilege('authenticated','public.obras_acoes_anexos','DELETE') THEN
    RAISE EXCEPTION 'Utilizadores autenticados não podem criar ou alterar directamente associações de anexos';
  END IF;

  IF NOT has_table_privilege('service_role','public.obras_acoes_anexos','INSERT') THEN
    RAISE EXCEPTION 'service_role não pode criar associações após validação no servidor';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'public.create_obras_acao_anexo(uuid,uuid,uuid,text,text,text,bigint,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.create_obras_acao_anexo(uuid,uuid,uuid,text,text,text,bigint,uuid)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.create_obras_acao_anexo(uuid,uuid,uuid,text,text,text,bigint,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'A RPC de anexos não está limitada a service_role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='obras_acoes_anexos'
      AND cmd='SELECT' AND 'authenticated'=ANY(roles)
      AND position('obras_can_read' in lower(coalesce(qual,''))) > 0
  ) OR EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='obras_acoes_anexos'
      AND cmd IN ('INSERT','DELETE') AND 'authenticated'=ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Políticas RLS de anexos não respeitam leitura por workspace e escrita exclusiva no servidor';
  END IF;

  SELECT public, file_size_limit, allowed_mime_types
    INTO _bucket
  FROM storage.buckets WHERE id='obras-acoes-anexos';
  IF NOT FOUND OR _bucket.public OR _bucket.file_size_limit <> 26214400
    OR NOT ('application/pdf'=ANY(_bucket.allowed_mime_types))
    OR NOT ('image/png'=ANY(_bucket.allowed_mime_types)) THEN
    RAISE EXCEPTION 'O bucket de anexos não é privado ou não respeita os limites esperados';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND 'authenticated'=ANY(roles)
      AND cmd IN ('INSERT','UPDATE','DELETE')
      AND coalesce(with_check,qual,'') LIKE '%obras-acoes-anexos%'
  ) THEN
    RAISE EXCEPTION 'Utilizadores autenticados têm escrita directa no bucket de anexos';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='obras_acao_anexos_storage_select'
      AND cmd='SELECT' AND 'authenticated'=ANY(roles)
      AND position('obras_can_read' in lower(coalesce(qual,''))) > 0
  ) THEN
    RAISE EXCEPTION 'Falta a política de leitura autorizada do bucket de anexos';
  END IF;

  -- The existing general document archive must retain its direct upload policy.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='obras_documentos_storage_insert'
      AND cmd='INSERT' AND 'authenticated'=ANY(roles)
  ) THEN
    RAISE EXCEPTION 'A política de upload do arquivo documental geral foi removida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.obras_acoes_anexos'::regclass
      AND conname='obras_acoes_anexos_document_fk'
  ) THEN RAISE EXCEPTION 'Falta a relação composta entre anexo e versão documental'; END IF;
END;
$$ $test$, 'FKT Works action attachments require server validation and workspace-scoped reads');

SELECT * FROM finish();
ROLLBACK;

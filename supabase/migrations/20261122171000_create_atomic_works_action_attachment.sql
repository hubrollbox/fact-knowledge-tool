-- Issue #118: atomically create a Works action attachment and its document archive records.
-- The file is uploaded first to the existing private obras-documentos bucket.
-- This SECURITY INVOKER RPC then creates the document, version and action link in one transaction.

CREATE OR REPLACE FUNCTION public.create_obras_acao_anexo(
  _acao_id uuid,
  _documento_id uuid,
  _versao_id uuid,
  _storage_path text,
  _nome_ficheiro text,
  _mime_type text,
  _tamanho_bytes bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_workspace_id uuid;
  v_obra_id uuid;
  v_anexo_id uuid;
  v_folders text[];
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão';
  END IF;

  IF _acao_id IS NULL OR _documento_id IS NULL OR _versao_id IS NULL THEN
    RAISE EXCEPTION 'Identificadores do anexo inválidos';
  END IF;

  IF _nome_ficheiro IS NULL OR length(btrim(_nome_ficheiro)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'Nome de ficheiro inválido';
  END IF;

  IF _mime_type IS NULL OR _mime_type NOT IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ) THEN
    RAISE EXCEPTION 'Formato de ficheiro não permitido';
  END IF;

  IF _tamanho_bytes IS NULL OR _tamanho_bytes NOT BETWEEN 1 AND 26214400 THEN
    RAISE EXCEPTION 'O ficheiro excede o limite permitido ou está vazio';
  END IF;

  SELECT a.workspace_id, a.obra_id
    INTO v_workspace_id, v_obra_id
  FROM public.obras_acoes AS a
  WHERE a.id = _acao_id
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acção não encontrada';
  END IF;

  IF NOT private.obras_can_write(v_workspace_id) THEN
    RAISE EXCEPTION 'Sem permissões para anexar ficheiros a esta acção';
  END IF;

  IF _storage_path IS NULL OR length(_storage_path) > 1024 THEN
    RAISE EXCEPTION 'Caminho do ficheiro inválido';
  END IF;

  v_folders := storage.foldername(_storage_path);
  IF cardinality(v_folders) <> 4
     OR v_folders[1] IS DISTINCT FROM v_workspace_id::text
     OR v_folders[2] IS DISTINCT FROM v_obra_id::text
     OR v_folders[3] IS DISTINCT FROM _documento_id::text
     OR v_folders[4] IS DISTINCT FROM _versao_id::text THEN
    RAISE EXCEPTION 'O ficheiro não pertence à obra e à acção indicadas';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects AS o
    WHERE o.bucket_id = 'obras-documentos'
      AND o.name = _storage_path
      AND o.metadata->>'mimetype' = _mime_type
      AND (o.metadata->>'size')::bigint = _tamanho_bytes
  ) THEN
    RAISE EXCEPTION 'O ficheiro não foi carregado para o arquivo documental';
  END IF;

  INSERT INTO public.obras_documentos (
    id, workspace_id, obra_id, titulo, categoria,
    entidade_origem, identificador, notas, created_by
  ) VALUES (
    _documento_id, v_workspace_id, v_obra_id,
    'Anexo: ' || _nome_ficheiro, 'outro',
    'FKT Works', _acao_id::text,
    'Ficheiro anexado a uma acção.', (SELECT auth.uid())
  );

  INSERT INTO public.obras_documento_versoes (
    id, documento_id, workspace_id, obra_id, numero_versao,
    storage_path, nome_ficheiro, mime_type, tamanho_bytes, uploaded_by
  ) VALUES (
    _versao_id, _documento_id, v_workspace_id, v_obra_id, 1,
    _storage_path, _nome_ficheiro, _mime_type, _tamanho_bytes, (SELECT auth.uid())
  );

  INSERT INTO public.obras_acoes_anexos (
    acao_id, documento_versao_id, workspace_id, obra_id, criado_por
  ) VALUES (
    _acao_id, _versao_id, v_workspace_id, v_obra_id, (SELECT auth.uid())
  )
  RETURNING id INTO v_anexo_id;

  RETURN v_anexo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_obras_acao_anexo(uuid, uuid, uuid, text, text, text, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_obras_acao_anexo(uuid, uuid, uuid, text, text, text, bigint)
  TO authenticated;

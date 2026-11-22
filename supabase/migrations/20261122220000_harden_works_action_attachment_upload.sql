-- Harden FKT Works task attachments with a dedicated, server-only upload bucket.
-- The general document archive continues using obras-documentos and its existing
-- authenticated upload flow. Action attachments are isolated in this bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obras-acoes-anexos',
  'obras-acoes-anexos',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- A user must not be able to create an attachment link directly, or call the
-- old RPC to bypass server-side file inspection.
DROP POLICY IF EXISTS obras_acoes_anexos_insert ON public.obras_acoes_anexos;
DROP POLICY IF EXISTS obras_acoes_anexos_delete ON public.obras_acoes_anexos;
REVOKE INSERT, DELETE ON TABLE public.obras_acoes_anexos FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.obras_acoes_anexos TO service_role;

DROP FUNCTION IF EXISTS public.create_obras_acao_anexo(uuid, uuid, uuid, text, text, text, bigint);

CREATE FUNCTION public.create_obras_acao_anexo(
  _acao_id uuid,
  _documento_id uuid,
  _versao_id uuid,
  _storage_path text,
  _nome_ficheiro text,
  _mime_type text,
  _tamanho_bytes bigint,
  _actor_id uuid
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
  IF _actor_id IS NULL OR _acao_id IS NULL OR _documento_id IS NULL OR _versao_id IS NULL THEN
    RAISE EXCEPTION 'Identificadores do anexo inválidos';
  END IF;

  IF _nome_ficheiro IS NULL OR length(btrim(_nome_ficheiro)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'Nome de ficheiro inválido';
  END IF;

  IF _mime_type IS NULL OR _mime_type NOT IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

  -- The Edge Function passes only the ID obtained from auth.getUser().
  -- Repeat the workspace-write check here; this RPC is executable only by service_role.
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = v_workspace_id AND w.user_id = _actor_id
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = v_workspace_id
        AND wm.user_id = _actor_id
        AND wm.role IN ('admin', 'editor')
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissões para anexar ficheiros a esta acção';
  END IF;

  -- Preserve the authenticated actor in append-only history triggers even
  -- though this RPC runs with the server's service_role credentials.
  PERFORM set_config('request.jwt.claim.sub', _actor_id::text, true);

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
    WHERE o.bucket_id = 'obras-acoes-anexos'
      AND o.name = _storage_path
      AND o.metadata->>'mimetype' = _mime_type
      AND (o.metadata->>'size')::bigint = _tamanho_bytes
  ) THEN
    RAISE EXCEPTION 'O ficheiro validado não existe no arquivo de anexos';
  END IF;

  INSERT INTO public.obras_documentos (
    id, workspace_id, obra_id, titulo, categoria,
    entidade_origem, identificador, notas, created_by
  ) VALUES (
    _documento_id, v_workspace_id, v_obra_id,
    'Anexo: ' || _nome_ficheiro, 'outro',
    'FKT Works', _acao_id::text,
    'Ficheiro anexado a uma acção.', _actor_id
  );

  INSERT INTO public.obras_documento_versoes (
    id, documento_id, workspace_id, obra_id, numero_versao,
    storage_path, nome_ficheiro, mime_type, tamanho_bytes, uploaded_by
  ) VALUES (
    _versao_id, _documento_id, v_workspace_id, v_obra_id, 1,
    _storage_path, _nome_ficheiro, _mime_type, _tamanho_bytes, _actor_id
  );

  INSERT INTO public.obras_acoes_anexos (
    acao_id, documento_versao_id, workspace_id, obra_id, criado_por
  ) VALUES (
    _acao_id, _versao_id, v_workspace_id, v_obra_id, _actor_id
  )
  RETURNING id INTO v_anexo_id;

  RETURN v_anexo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_obras_acao_anexo(uuid, uuid, uuid, text, text, text, bigint, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_obras_acao_anexo(uuid, uuid, uuid, text, text, text, bigint, uuid)
  TO service_role;

-- Authenticated users may download only objects already linked to an action
-- they can read. There are deliberately no INSERT, UPDATE or DELETE policies.
CREATE POLICY obras_acao_anexos_storage_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'obras-acoes-anexos'
  AND cardinality(storage.foldername(name)) = 4
  AND private.obras_can_read(((storage.foldername(name))[1])::uuid)
  AND EXISTS (
    SELECT 1
    FROM public.obras_acoes_anexos a
    JOIN public.obras_documento_versoes v
      ON v.id = a.documento_versao_id
     AND v.workspace_id = a.workspace_id
     AND v.obra_id = a.obra_id
    WHERE v.storage_path = objects.name
      AND a.workspace_id = ((storage.foldername(objects.name))[1])::uuid
      AND a.obra_id = ((storage.foldername(objects.name))[2])::uuid
  )
);

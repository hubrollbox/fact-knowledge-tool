CREATE OR REPLACE FUNCTION public.create_obras_documento_versao(
  _documento_id uuid,
  _storage_path text,
  _nome_ficheiro text,
  _mime_type text,
  _tamanho_bytes bigint,
  _notas text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _workspace_id uuid;
  _obra_id uuid;
  _numero_versao integer;
  _versao_id uuid;
BEGIN
  SELECT d.workspace_id, d.obra_id INTO _workspace_id, _obra_id
  FROM public.obras_documentos d WHERE d.id = _documento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF NOT private.obras_can_write(_workspace_id) THEN
    RAISE EXCEPTION 'Sem permissões para adicionar uma versão a este documento';
  END IF;
  SELECT COALESCE(MAX(v.numero_versao), 0) + 1 INTO _numero_versao
  FROM public.obras_documento_versoes v WHERE v.documento_id = _documento_id;
  INSERT INTO public.obras_documento_versoes (
    documento_id, workspace_id, obra_id, numero_versao, storage_path,
    nome_ficheiro, mime_type, tamanho_bytes, notas, uploaded_by
  ) VALUES (
    _documento_id, _workspace_id, _obra_id, _numero_versao, _storage_path,
    _nome_ficheiro, _mime_type, _tamanho_bytes, _notas, auth.uid()
  ) RETURNING id INTO _versao_id;
  RETURN _versao_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_obras_documento_versao(uuid, text, text, text, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_obras_documento_versao(uuid, text, text, text, bigint, text) TO authenticated;

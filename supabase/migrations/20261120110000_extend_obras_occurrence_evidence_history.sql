-- Issue #59: extend occurrence traceability to photographic and documentary evidence.
-- Reuse the existing immutable history table and trigger function.

CREATE TRIGGER obras_fotos_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_fotos
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();

CREATE TRIGGER obras_documentos_ligacoes_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_documentos_ligacoes
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();

-- A new document version also affects every occurrence to which that document
-- is linked. Record the event against each occurrence dossier, without copying
-- document contents or creating another audit table.
CREATE OR REPLACE FUNCTION private.registar_obras_documento_versao_ocorrencias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  row_data jsonb;
  old_data jsonb;
  new_data jsonb;
  ws_id uuid;
  doc_id uuid;
  version_id uuid;
  link_row record;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_data := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_data := to_jsonb(NEW); END IF;
  row_data := COALESCE(new_data, old_data);
  ws_id := NULLIF(row_data->>'workspace_id', '')::uuid;
  doc_id := NULLIF(row_data->>'documento_id', '')::uuid;
  version_id := NULLIF(row_data->>'id', '')::uuid;

  IF ws_id IS NULL OR doc_id IS NULL OR version_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível determinar o contexto documental para auditoria';
  END IF;

  FOR link_row IN
    SELECT l.ocorrencia_id
    FROM public.obras_documentos_ligacoes AS l
    WHERE l.documento_id = doc_id
      AND l.workspace_id = ws_id
      AND l.ocorrencia_id IS NOT NULL
  LOOP
    INSERT INTO public.obras_historico_eventos (
      workspace_id, entidade, entidade_id, entidade_pai, entidade_pai_id,
      operacao, actor_id, dados_anteriores, dados_novos
    ) VALUES (
      ws_id, 'obras_documento_versoes', version_id,
      'obras_ocorrencias', link_row.ocorrencia_id,
      TG_OP, (SELECT auth.uid()), old_data, new_data
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.registar_obras_documento_versao_ocorrencias() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_documento_versoes_ocorrencia_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_documento_versoes
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_documento_versao_ocorrencias();

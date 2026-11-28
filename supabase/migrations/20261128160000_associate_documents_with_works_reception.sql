ALTER TABLE public.obras_recepcoes
  ADD COLUMN documentos_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
CREATE OR REPLACE FUNCTION private.validar_documentos_recepcao()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE doc_id uuid;
BEGIN
  FOREACH doc_id IN ARRAY NEW.documentos_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.obras_documentos d
      WHERE d.id = doc_id AND d.obra_id = NEW.obra_id AND d.workspace_id = NEW.workspace_id
    ) THEN
      RAISE EXCEPTION 'O documento seleccionado não pertence a esta obra';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validar_documentos_recepcao() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER obras_recepcoes_validar_documentos
  BEFORE INSERT OR UPDATE OF documentos_ids, obra_id, workspace_id ON public.obras_recepcoes
  FOR EACH ROW EXECUTE FUNCTION private.validar_documentos_recepcao();
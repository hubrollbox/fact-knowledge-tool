ALTER TABLE public.workspaces DROP CONSTRAINT workspaces_modulo_check;
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_modulo_check CHECK (modulo = ANY (ARRAY['juridico','canil','dev','obras']));

CREATE OR REPLACE FUNCTION private.obras_check_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  IF TG_TABLE_NAME IN ('obras_visitas','obras_ocorrencias','obras_acoes') THEN
    SELECT workspace_id INTO ws FROM public.obras WHERE id = NEW.obra_id;
    IF ws IS DISTINCT FROM NEW.workspace_id THEN RAISE EXCEPTION 'A obra não pertence a este espaço de trabalho'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'obras_ocorrencias' AND NEW.visita_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.obras_visitas WHERE id = NEW.visita_id AND obra_id = NEW.obra_id) THEN
      RAISE EXCEPTION 'A visita não pertence a esta obra'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'obras_acoes' AND NEW.ocorrencia_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.obras_ocorrencias WHERE id = NEW.ocorrencia_id AND obra_id = NEW.obra_id) THEN
      RAISE EXCEPTION 'A ocorrência não pertence a esta obra'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'obras_fotos' THEN
    IF NEW.visita_id IS NULL AND NEW.ocorrencia_id IS NULL THEN RAISE EXCEPTION 'A foto tem de estar ligada a uma visita ou ocorrência'; END IF;
    IF NEW.visita_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.obras_visitas WHERE id = NEW.visita_id AND workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'A visita não pertence a este espaço de trabalho'; END IF;
    IF NEW.ocorrencia_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.obras_ocorrencias WHERE id = NEW.ocorrencia_id AND workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'A ocorrência não pertence a este espaço de trabalho'; END IF;
    IF split_part(NEW.storage_path, '/', 1) <> NEW.workspace_id::text THEN
      RAISE EXCEPTION 'Caminho da foto inválido'; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.obras_check_workspace() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_visitas_ws BEFORE INSERT OR UPDATE ON public.obras_visitas FOR EACH ROW EXECUTE FUNCTION private.obras_check_workspace();
CREATE TRIGGER obras_ocorrencias_ws BEFORE INSERT OR UPDATE ON public.obras_ocorrencias FOR EACH ROW EXECUTE FUNCTION private.obras_check_workspace();
CREATE TRIGGER obras_acoes_ws BEFORE INSERT OR UPDATE ON public.obras_acoes FOR EACH ROW EXECUTE FUNCTION private.obras_check_workspace();
CREATE TRIGGER obras_fotos_ws BEFORE INSERT OR UPDATE ON public.obras_fotos FOR EACH ROW EXECUTE FUNCTION private.obras_check_workspace();
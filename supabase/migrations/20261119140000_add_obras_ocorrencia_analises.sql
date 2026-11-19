-- Issue #24: structured technical analysis for FKT Obras occurrences.
CREATE TABLE public.obras_ocorrencia_analises (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ocorrencia_id uuid NOT NULL UNIQUE REFERENCES public.obras_ocorrencias(id) ON DELETE CASCADE,
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 interpretacao text,
 referencias_gerais text,
 conclusao text,
 recomendacao text,
 informacao_em_falta text,
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT obras_ocorrencia_analises_id_workspace_unique UNIQUE (id, workspace_id)
);
CREATE TABLE public.obras_ocorrencia_factos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 analise_id uuid NOT NULL,
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 descricao text NOT NULL CHECK (length(trim(descricao)) > 0),
 estado text NOT NULL DEFAULT 'por_confirmar' CHECK (estado IN ('confirmado','por_confirmar')),
 evidencia_foto_id uuid REFERENCES public.obras_fotos(id) ON DELETE SET NULL,
 referencia text,
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT obras_ocorrencia_factos_analise_workspace_fkey
   FOREIGN KEY (analise_id,workspace_id)
   REFERENCES public.obras_ocorrencia_analises(id,workspace_id) ON DELETE CASCADE
);
CREATE INDEX obras_ocorrencia_analises_workspace_idx ON public.obras_ocorrencia_analises(workspace_id);
CREATE INDEX obras_ocorrencia_factos_analise_idx ON public.obras_ocorrencia_factos(analise_id);
CREATE INDEX obras_ocorrencia_factos_workspace_idx ON public.obras_ocorrencia_factos(workspace_id);
ALTER TABLE public.obras_ocorrencia_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_ocorrencia_factos ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.obras_ocorrencia_analises TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.obras_ocorrencia_factos TO authenticated;
CREATE POLICY obras_ocorrencia_analises_select ON public.obras_ocorrencia_analises FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencia_analises_insert ON public.obras_ocorrencia_analises FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id) AND created_by IS NOT DISTINCT FROM (SELECT auth.uid()) AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid()));
CREATE POLICY obras_ocorrencia_analises_update ON public.obras_ocorrencia_analises FOR UPDATE TO authenticated USING (private.obras_can_write(workspace_id)) WITH CHECK (private.obras_can_write(workspace_id) AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid()));
CREATE POLICY obras_ocorrencia_analises_delete ON public.obras_ocorrencia_analises FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));
CREATE POLICY obras_ocorrencia_factos_select ON public.obras_ocorrencia_factos FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencia_factos_insert ON public.obras_ocorrencia_factos FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id) AND created_by IS NOT DISTINCT FROM (SELECT auth.uid()));
CREATE POLICY obras_ocorrencia_factos_delete ON public.obras_ocorrencia_factos FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));
CREATE OR REPLACE FUNCTION private.validate_obras_ocorrencia_analise()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.obras_ocorrencias o
    WHERE o.id = NEW.ocorrencia_id AND o.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'A ocorrência não pertence a este espaço de trabalho';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_obras_ocorrencia_analise() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER obras_ocorrencia_analises_validate
  BEFORE INSERT OR UPDATE ON public.obras_ocorrencia_analises
  FOR EACH ROW EXECUTE FUNCTION private.validate_obras_ocorrencia_analise();

CREATE OR REPLACE FUNCTION private.validate_obras_ocorrencia_facto()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _ocorrencia_id uuid;
BEGIN
 SELECT ocorrencia_id INTO _ocorrencia_id
 FROM public.obras_ocorrencia_analises
 WHERE id=NEW.analise_id AND workspace_id=NEW.workspace_id;
 IF _ocorrencia_id IS NULL THEN RAISE EXCEPTION 'A análise não pertence a este espaço de trabalho'; END IF;
 IF NEW.evidencia_foto_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.obras_fotos f
   WHERE f.id=NEW.evidencia_foto_id AND f.workspace_id=NEW.workspace_id AND f.ocorrencia_id=_ocorrencia_id
 ) THEN RAISE EXCEPTION 'A fotografia seleccionada não está associada a esta ocorrência'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_obras_ocorrencia_facto() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER obras_ocorrencia_factos_validate BEFORE INSERT ON public.obras_ocorrencia_factos
FOR EACH ROW EXECUTE FUNCTION private.validate_obras_ocorrencia_facto();
CREATE TRIGGER obras_ocorrencia_analises_updated_at BEFORE UPDATE ON public.obras_ocorrencia_analises
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

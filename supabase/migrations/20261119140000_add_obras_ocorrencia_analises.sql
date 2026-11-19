-- Issue #24: structured technical analysis for FKT Obras occurrences.
-- Every relation carries workspace and occurrence identifiers to prevent cross-workspace links.

ALTER TABLE public.obras_ocorrencias
  ADD CONSTRAINT obras_ocorrencias_id_workspace_unique UNIQUE (id, workspace_id);

ALTER TABLE public.obras_fotos
  ADD CONSTRAINT obras_fotos_id_ocorrencia_workspace_unique UNIQUE (id, ocorrencia_id, workspace_id);

CREATE TABLE public.obras_ocorrencia_analises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL UNIQUE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  interpretacao text,
  conclusao text,
  recomendacao text,
  informacao_em_falta text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_ocorrencia_analises_ocorrencia_workspace_fkey
    FOREIGN KEY (ocorrencia_id, workspace_id)
    REFERENCES public.obras_ocorrencias(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT obras_ocorrencia_analises_id_ocorrencia_workspace_unique
    UNIQUE (id, ocorrencia_id, workspace_id)
);

CREATE TABLE public.obras_ocorrencia_referencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id uuid NOT NULL,
  ocorrencia_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('norma', 'regulamento', 'projeto', 'ficha_tecnica', 'outro')),
  titulo text NOT NULL CHECK (length(trim(titulo)) > 0),
  entidade_origem text,
  identificador text,
  versao text,
  data_documento date,
  url text CHECK (url IS NULL OR url ~ '^https?://'),
  notas text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_ocorrencia_referencias_analise_fkey
    FOREIGN KEY (analise_id, ocorrencia_id, workspace_id)
    REFERENCES public.obras_ocorrencia_analises(id, ocorrencia_id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT obras_ocorrencia_referencias_id_analise_ocorrencia_workspace_unique
    UNIQUE (id, analise_id, ocorrencia_id, workspace_id)
);

CREATE TABLE public.obras_ocorrencia_factos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id uuid NOT NULL,
  ocorrencia_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  descricao text NOT NULL CHECK (length(trim(descricao)) > 0),
  estado text NOT NULL DEFAULT 'por_confirmar' CHECK (estado IN ('confirmado', 'por_confirmar')),
  evidencia_foto_id uuid,
  referencia_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_ocorrencia_factos_analise_fkey
    FOREIGN KEY (analise_id, ocorrencia_id, workspace_id)
    REFERENCES public.obras_ocorrencia_analises(id, ocorrencia_id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT obras_ocorrencia_factos_evidencia_foto_fkey
    FOREIGN KEY (evidencia_foto_id, ocorrencia_id, workspace_id)
    REFERENCES public.obras_fotos(id, ocorrencia_id, workspace_id)
    ON DELETE SET NULL (evidencia_foto_id),
  CONSTRAINT obras_ocorrencia_factos_referencia_fkey
    FOREIGN KEY (referencia_id, analise_id, ocorrencia_id, workspace_id)
    REFERENCES public.obras_ocorrencia_referencias(id, analise_id, ocorrencia_id, workspace_id)
    ON DELETE SET NULL (referencia_id),
  CONSTRAINT obras_ocorrencia_factos_referencia_unica
    UNIQUE (id, analise_id, ocorrencia_id, workspace_id)
);

CREATE INDEX obras_ocorrencia_analises_workspace_idx ON public.obras_ocorrencia_analises(workspace_id);
CREATE INDEX obras_ocorrencia_referencias_analise_idx ON public.obras_ocorrencia_referencias(analise_id, created_at);
CREATE INDEX obras_ocorrencia_referencias_workspace_idx ON public.obras_ocorrencia_referencias(workspace_id);
CREATE INDEX obras_ocorrencia_factos_analise_idx ON public.obras_ocorrencia_factos(analise_id, created_at);
CREATE INDEX obras_ocorrencia_factos_workspace_idx ON public.obras_ocorrencia_factos(workspace_id);

ALTER TABLE public.obras_ocorrencia_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_ocorrencia_referencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_ocorrencia_factos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.obras_ocorrencia_analises, public.obras_ocorrencia_referencias, public.obras_ocorrencia_factos
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.obras_ocorrencia_analises, public.obras_ocorrencia_referencias, public.obras_ocorrencia_factos
  TO authenticated;
GRANT ALL ON TABLE public.obras_ocorrencia_analises, public.obras_ocorrencia_referencias, public.obras_ocorrencia_factos
  TO service_role;

CREATE POLICY obras_ocorrencia_analises_select ON public.obras_ocorrencia_analises
  FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencia_analises_insert ON public.obras_ocorrencia_analises
  FOR INSERT TO authenticated WITH CHECK (
    private.obras_can_write(workspace_id)
    AND created_by IS NOT DISTINCT FROM (SELECT auth.uid())
    AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid())
  );
CREATE POLICY obras_ocorrencia_analises_update ON public.obras_ocorrencia_analises
  FOR UPDATE TO authenticated USING (private.obras_can_write(workspace_id))
  WITH CHECK (private.obras_can_write(workspace_id) AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid()));
CREATE POLICY obras_ocorrencia_analises_delete ON public.obras_ocorrencia_analises
  FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));

CREATE POLICY obras_ocorrencia_referencias_select ON public.obras_ocorrencia_referencias
  FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencia_referencias_insert ON public.obras_ocorrencia_referencias
  FOR INSERT TO authenticated WITH CHECK (
    private.obras_can_write(workspace_id)
    AND created_by IS NOT DISTINCT FROM (SELECT auth.uid())
    AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid())
  );
CREATE POLICY obras_ocorrencia_referencias_update ON public.obras_ocorrencia_referencias
  FOR UPDATE TO authenticated USING (private.obras_can_write(workspace_id))
  WITH CHECK (private.obras_can_write(workspace_id) AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid()));
CREATE POLICY obras_ocorrencia_referencias_delete ON public.obras_ocorrencia_referencias
  FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));

CREATE POLICY obras_ocorrencia_factos_select ON public.obras_ocorrencia_factos
  FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencia_factos_insert ON public.obras_ocorrencia_factos
  FOR INSERT TO authenticated WITH CHECK (
    private.obras_can_write(workspace_id)
    AND created_by IS NOT DISTINCT FROM (SELECT auth.uid())
    AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid())
  );
CREATE POLICY obras_ocorrencia_factos_update ON public.obras_ocorrencia_factos
  FOR UPDATE TO authenticated USING (private.obras_can_write(workspace_id))
  WITH CHECK (private.obras_can_write(workspace_id) AND updated_by IS NOT DISTINCT FROM (SELECT auth.uid()));
CREATE POLICY obras_ocorrencia_factos_delete ON public.obras_ocorrencia_factos
  FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));

-- Audit fields are set by the database, not trusted to client-supplied values.
CREATE OR REPLACE FUNCTION private.set_obras_ocorrencia_analysis_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := (SELECT auth.uid());
  ELSE
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_by := (SELECT auth.uid());
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.set_obras_ocorrencia_analysis_audit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_ocorrencia_analises_audit
  BEFORE INSERT OR UPDATE ON public.obras_ocorrencia_analises
  FOR EACH ROW EXECUTE FUNCTION private.set_obras_ocorrencia_analysis_audit();
CREATE TRIGGER obras_ocorrencia_referencias_audit
  BEFORE INSERT OR UPDATE ON public.obras_ocorrencia_referencias
  FOR EACH ROW EXECUTE FUNCTION private.set_obras_ocorrencia_analysis_audit();
CREATE TRIGGER obras_ocorrencia_factos_audit
  BEFORE INSERT OR UPDATE ON public.obras_ocorrencia_factos
  FOR EACH ROW EXECUTE FUNCTION private.set_obras_ocorrencia_analysis_audit();

-- Updating a fact or reference also updates the parent analysis timestamp.
CREATE OR REPLACE FUNCTION private.touch_obras_ocorrencia_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.obras_ocorrencia_analises
  SET updated_at = now(), updated_by = (SELECT auth.uid())
  WHERE id = NEW.analise_id;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.touch_obras_ocorrencia_analysis() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_ocorrencia_referencias_touch_analysis
  AFTER INSERT OR UPDATE ON public.obras_ocorrencia_referencias
  FOR EACH ROW EXECUTE FUNCTION private.touch_obras_ocorrencia_analysis();
CREATE TRIGGER obras_ocorrencia_factos_touch_analysis
  AFTER INSERT OR UPDATE ON public.obras_ocorrencia_factos
  FOR EACH ROW EXECUTE FUNCTION private.touch_obras_ocorrencia_analysis();

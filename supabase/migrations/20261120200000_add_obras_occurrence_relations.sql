-- Issue #28: manually confirmed relationships between occurrences.
-- Relationships are symmetric, workspace-scoped and never imply a shared cause.

CREATE TABLE public.obras_ocorrencias_relacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ocorrencia_id uuid NOT NULL,
  ocorrencia_relacionada_id uuid NOT NULL,
  criado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_ocorrencias_relacoes_not_self
    CHECK (ocorrencia_id <> ocorrencia_relacionada_id),
  CONSTRAINT obras_ocorrencias_relacoes_canonical_order
    CHECK (ocorrencia_id < ocorrencia_relacionada_id),
  CONSTRAINT obras_ocorrencias_relacoes_left_fk
    FOREIGN KEY (ocorrencia_id, workspace_id)
    REFERENCES public.obras_ocorrencias(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT obras_ocorrencias_relacoes_right_fk
    FOREIGN KEY (ocorrencia_relacionada_id, workspace_id)
    REFERENCES public.obras_ocorrencias(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT obras_ocorrencias_relacoes_unique
    UNIQUE (workspace_id, ocorrencia_id, ocorrencia_relacionada_id)
);

CREATE INDEX obras_ocorrencias_relacoes_right_idx
  ON public.obras_ocorrencias_relacoes(workspace_id, ocorrencia_relacionada_id);

ALTER TABLE public.obras_ocorrencias_relacoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.obras_ocorrencias_relacoes TO authenticated;
GRANT ALL ON public.obras_ocorrencias_relacoes TO service_role;

CREATE POLICY obras_ocorrencias_relacoes_select
  ON public.obras_ocorrencias_relacoes FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencias_relacoes_insert
  ON public.obras_ocorrencias_relacoes FOR INSERT TO authenticated
  WITH CHECK (private.obras_can_write(workspace_id) AND criado_por = (SELECT auth.uid()));
CREATE POLICY obras_ocorrencias_relacoes_delete
  ON public.obras_ocorrencias_relacoes FOR DELETE TO authenticated
  USING (private.obras_can_write(workspace_id));

CREATE TRIGGER obras_ocorrencias_relacoes_historico
  AFTER INSERT OR DELETE ON public.obras_ocorrencias_relacoes
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();

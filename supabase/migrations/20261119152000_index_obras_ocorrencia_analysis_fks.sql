-- Cover the foreign keys introduced by issue #24.
-- Composite indexes also support the occurrence-scoped list queries.

CREATE INDEX obras_ocorrencia_analises_created_by_idx
  ON public.obras_ocorrencia_analises(created_by);
CREATE INDEX obras_ocorrencia_analises_updated_by_idx
  ON public.obras_ocorrencia_analises(updated_by);
CREATE INDEX obras_ocorrencia_analises_ocorrencia_workspace_idx
  ON public.obras_ocorrencia_analises(ocorrencia_id, workspace_id);

DROP INDEX IF EXISTS public.obras_ocorrencia_factos_analise_idx;
CREATE INDEX obras_ocorrencia_factos_analise_ocorrencia_workspace_idx
  ON public.obras_ocorrencia_factos(analise_id, ocorrencia_id, workspace_id);
CREATE INDEX obras_ocorrencia_factos_created_by_idx
  ON public.obras_ocorrencia_factos(created_by);
CREATE INDEX obras_ocorrencia_factos_updated_by_idx
  ON public.obras_ocorrencia_factos(updated_by);
CREATE INDEX obras_ocorrencia_factos_evidencia_foto_idx
  ON public.obras_ocorrencia_factos(evidencia_foto_id, ocorrencia_id, workspace_id);
CREATE INDEX obras_ocorrencia_factos_referencia_idx
  ON public.obras_ocorrencia_factos(referencia_id, analise_id, ocorrencia_id, workspace_id);

DROP INDEX IF EXISTS public.obras_ocorrencia_referencias_analise_idx;
CREATE INDEX obras_ocorrencia_referencias_analise_ocorrencia_workspace_idx
  ON public.obras_ocorrencia_referencias(analise_id, ocorrencia_id, workspace_id);
CREATE INDEX obras_ocorrencia_referencias_created_by_idx
  ON public.obras_ocorrencia_referencias(created_by);
CREATE INDEX obras_ocorrencia_referencias_updated_by_idx
  ON public.obras_ocorrencia_referencias(updated_by);

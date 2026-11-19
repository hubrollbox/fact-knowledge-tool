CREATE INDEX obras_documentos_workspace_fk_idx ON public.obras_documentos(workspace_id);
CREATE INDEX obras_documentos_obra_workspace_fk_idx ON public.obras_documentos(obra_id, workspace_id);
CREATE INDEX obras_documento_versoes_documento_workspace_obra_fk_idx
  ON public.obras_documento_versoes(documento_id, workspace_id, obra_id);
CREATE INDEX obras_documentos_ligacoes_documento_workspace_obra_fk_idx
  ON public.obras_documentos_ligacoes(documento_id, workspace_id, obra_id);
CREATE INDEX obras_documentos_ligacoes_visita_workspace_obra_fk_idx
  ON public.obras_documentos_ligacoes(visita_id, workspace_id, obra_id);
CREATE INDEX obras_documentos_ligacoes_ocorrencia_workspace_obra_fk_idx
  ON public.obras_documentos_ligacoes(ocorrencia_id, workspace_id, obra_id);
CREATE INDEX obras_ocorrencia_referencias_documento_versao_workspace_fk_idx
  ON public.obras_ocorrencia_referencias(documento_versao_id, workspace_id)
  WHERE documento_versao_id IS NOT NULL;
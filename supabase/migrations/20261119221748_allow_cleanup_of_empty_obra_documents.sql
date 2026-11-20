CREATE POLICY obras_documentos_delete_empty ON public.obras_documentos
FOR DELETE TO authenticated USING (
  private.obras_can_write(workspace_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.obras_documento_versoes v WHERE v.documento_id = id
  )
);
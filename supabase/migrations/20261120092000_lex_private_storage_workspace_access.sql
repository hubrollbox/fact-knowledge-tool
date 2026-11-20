-- Allow authorised FKT Lex workspace members to access private legal files.
-- The object path is: <uploader_user_id>/<workspace_id>/<process_id>/<filename>.
-- Existing per-user policies remain in place for other private documents.
DROP POLICY IF EXISTS fkt_lex_documents_workspace_select ON storage.objects;
DROP POLICY IF EXISTS fkt_lex_documents_workspace_insert ON storage.objects;
DROP POLICY IF EXISTS fkt_lex_documents_workspace_update ON storage.objects;
DROP POLICY IF EXISTS fkt_lex_documents_workspace_delete ON storage.objects;

CREATE POLICY fkt_lex_documents_workspace_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.workspace_can_read(((storage.foldername(name))[2])::uuid, auth.uid())
);

CREATE POLICY fkt_lex_documents_workspace_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.workspace_can_write(((storage.foldername(name))[2])::uuid, auth.uid())
);

CREATE POLICY fkt_lex_documents_workspace_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.workspace_can_write(((storage.foldername(name))[2])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.workspace_can_write(((storage.foldername(name))[2])::uuid, auth.uid())
);

CREATE POLICY fkt_lex_documents_workspace_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.workspace_can_write(((storage.foldername(name))[2])::uuid, auth.uid())
);

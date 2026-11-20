-- Make the documentos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documentos';

-- Add storage RLS policies for documentos bucket
CREATE POLICY "Users can access own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
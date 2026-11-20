-- Arquivo documental do FKT Works, isolado do modelo documental do FKT Lex.
ALTER TABLE public.obras ADD CONSTRAINT obras_id_workspace_unique UNIQUE (id, workspace_id);
ALTER TABLE public.obras_visitas ADD CONSTRAINT obras_visitas_id_workspace_obra_unique UNIQUE (id, workspace_id, obra_id);
ALTER TABLE public.obras_ocorrencias ADD CONSTRAINT obras_ocorrencias_id_workspace_obra_unique UNIQUE (id, workspace_id, obra_id);

CREATE TABLE public.obras_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  titulo text NOT NULL CHECK (length(trim(titulo)) > 0),
  categoria text NOT NULL DEFAULT 'outro',
  entidade_origem text,
  identificador text,
  data_documento date,
  notas text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_documentos_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT obras_documentos_id_workspace_obra_unique UNIQUE (id, workspace_id, obra_id),
  CONSTRAINT obras_documentos_workspace_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT obras_documentos_obra_workspace_fkey FOREIGN KEY (obra_id, workspace_id) REFERENCES public.obras(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE public.obras_documento_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  numero_versao integer NOT NULL CHECK (numero_versao > 0),
  storage_path text NOT NULL UNIQUE,
  nome_ficheiro text NOT NULL,
  mime_type text NOT NULL,
  tamanho_bytes bigint NOT NULL CHECK (tamanho_bytes > 0),
  notas text,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_documento_versoes_doc_version_unique UNIQUE (documento_id, numero_versao),
  CONSTRAINT obras_documento_versoes_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT obras_documento_versoes_doc_workspace_obra_fkey FOREIGN KEY (documento_id, workspace_id, obra_id)
    REFERENCES public.obras_documentos(id, workspace_id, obra_id) ON DELETE CASCADE
);

CREATE TABLE public.obras_documentos_ligacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  visita_id uuid,
  ocorrencia_id uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_documentos_ligacoes_contexto_check CHECK (visita_id IS NOT NULL OR ocorrencia_id IS NOT NULL),
  CONSTRAINT obras_documentos_ligacoes_documento_fkey FOREIGN KEY (documento_id, workspace_id, obra_id)
    REFERENCES public.obras_documentos(id, workspace_id, obra_id) ON DELETE CASCADE,
  CONSTRAINT obras_documentos_ligacoes_visita_fkey FOREIGN KEY (visita_id, workspace_id, obra_id)
    REFERENCES public.obras_visitas(id, workspace_id, obra_id) ON DELETE CASCADE,
  CONSTRAINT obras_documentos_ligacoes_ocorrencia_fkey FOREIGN KEY (ocorrencia_id, workspace_id, obra_id)
    REFERENCES public.obras_ocorrencias(id, workspace_id, obra_id) ON DELETE CASCADE
);

ALTER TABLE public.obras_ocorrencia_referencias
  ADD COLUMN documento_versao_id uuid,
  ADD CONSTRAINT obras_ocorrencia_referencias_documento_versao_fkey
    FOREIGN KEY (documento_versao_id, workspace_id)
    REFERENCES public.obras_documento_versoes(id, workspace_id) ON DELETE RESTRICT;

CREATE INDEX obras_documentos_obra_created_idx ON public.obras_documentos(obra_id, created_at DESC);
CREATE INDEX obras_documento_versoes_documento_idx ON public.obras_documento_versoes(documento_id, numero_versao DESC);
CREATE INDEX obras_documentos_ligacoes_visita_idx ON public.obras_documentos_ligacoes(visita_id) WHERE visita_id IS NOT NULL;
CREATE INDEX obras_documentos_ligacoes_ocorrencia_idx ON public.obras_documentos_ligacoes(ocorrencia_id) WHERE ocorrencia_id IS NOT NULL;

ALTER TABLE public.obras_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_documento_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_documentos_ligacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY obras_documentos_select ON public.obras_documentos FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_documentos_insert ON public.obras_documentos FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY obras_documentos_update ON public.obras_documentos FOR UPDATE TO authenticated USING (private.obras_can_write(workspace_id)) WITH CHECK (private.obras_can_write(workspace_id));

CREATE POLICY obras_documento_versoes_select ON public.obras_documento_versoes FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_documento_versoes_insert ON public.obras_documento_versoes FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id) AND uploaded_by = auth.uid());

CREATE POLICY obras_documentos_ligacoes_select ON public.obras_documentos_ligacoes FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_documentos_ligacoes_insert ON public.obras_documentos_ligacoes FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY obras_documentos_ligacoes_delete ON public.obras_documentos_ligacoes FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('obras-documentos', 'obras-documentos', false, 26214400, ARRAY[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','image/jpeg','image/png'
]) ON CONFLICT (id) DO NOTHING;

CREATE POLICY obras_documentos_storage_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'obras-documentos'
  AND private.obras_can_read(((storage.foldername(name))[1])::uuid)
  AND EXISTS (SELECT 1 FROM public.obras o WHERE o.id = ((storage.foldername(name))[2])::uuid AND o.workspace_id = ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY obras_documentos_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'obras-documentos'
  AND private.obras_can_write(((storage.foldername(name))[1])::uuid)
  AND EXISTS (SELECT 1 FROM public.obras o WHERE o.id = ((storage.foldername(name))[2])::uuid AND o.workspace_id = ((storage.foldername(name))[1])::uuid)
);
CREATE POLICY obras_documentos_storage_delete_orphan ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'obras-documentos'
  AND private.obras_can_write(((storage.foldername(name))[1])::uuid)
  AND NOT EXISTS (SELECT 1 FROM public.obras_documento_versoes v WHERE v.storage_path = name)
);

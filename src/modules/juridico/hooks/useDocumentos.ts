import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentoInsert } from '../types/juridico';

export function useDocumentos(processoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico_documentos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('juridico_documentos')
        .select('*')
        .eq('processo_id', processoId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const documentos = data ?? [];
      const paths = documentos
        .map((documento) => documento.ficheiro_url)
        .filter((path): path is string => !!path);

      if (!paths.length) return documentos.map((documento) => ({ ...documento, signed_url: null }));

      const { data: signedFiles, error: signedError } = await supabase
        .storage.from('documentos').createSignedUrls(paths, 600);
      if (signedError) throw signedError;

      const signedByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]));
      return documentos.map((documento) => ({
        ...documento,
        signed_url: documento.ficheiro_url ? signedByPath.get(documento.ficheiro_url) ?? null : null,
      }));
    },
    enabled: !!processoId,
  });
}

export function useUploadDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, meta }: { file: File; meta: Omit<DocumentoInsert, 'ficheiro_url'> }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Não autenticado');

      const safeName = file.name.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'documento';
      const path = `${user.id}/${meta.workspace_id}/${meta.processo_id}/${crypto.randomUUID()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('juridico_documentos')
        .insert({ ...meta, ficheiro_url: path })
        .select()
        .single();

      if (error) {
        const { error: cleanupError } = await supabase.storage.from('documentos').remove([path]);
        if (cleanupError) {
          console.error('Falha ao limpar ficheiro após erro no registo do documento:', cleanupError);
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['juridico_documentos', data.processo_id] });
    },
  });
}

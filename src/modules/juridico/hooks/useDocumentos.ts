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
      return data;
    },
    enabled: !!processoId,
  });
}

export function useUploadDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      meta,
    }: {
      file: File;
      meta: Omit<DocumentoInsert, 'ficheiro_url'>;
    }) => {
      // Upload to storage
      const path = `juridico/${meta.workspace_id}/${meta.processo_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, file);
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(path);

      // Insert record
      const { data, error } = await supabase
        .from('juridico_documentos')
        .insert({ ...meta, ficheiro_url: urlData.publicUrl })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['juridico_documentos', data.processo_id] });
    },
  });
}

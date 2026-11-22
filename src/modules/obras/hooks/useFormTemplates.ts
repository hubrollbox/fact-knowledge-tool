import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useObrasWorkspace } from './useObrasWorkspace';
import { toast } from '@/hooks/use-toast';

export type FormFieldType = 'text' | 'number' | 'date' | 'choice' | 'boolean' | 'attachment' | 'photo';
export type FormField = { id: string; label: string; type: FormFieldType; required: boolean; options?: string[] };
export type FormSection = { id: string; title: string; fields: FormField[] };
export type FormDefinition = { sections: FormSection[] };

export type FormTemplate = {
  id: string;
  workspace_id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  estado: 'rascunho' | 'activo' | 'arquivado';
  draft_definicao: FormDefinition | null;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
};

const db = supabase as any;
const emptyDefinition: FormDefinition = { sections: [{ id: crypto.randomUUID(), title: 'Secção 1', fields: [] }] };

export function useFormTemplates() {
  const workspaceId = useObrasWorkspace();
  return useQuery({
    queryKey: ['obras-formularios', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await db.from('obras_formularios').select('*')
        .eq('workspace_id', workspaceId).order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FormTemplate[];
    },
  });
}

export function useFormTemplate(id?: string) {
  return useQuery({
    queryKey: ['obras-formulario', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from('obras_formularios').select('*').eq('id', id).single();
      if (error) throw error;
      if (!data.draft_definicao && data.current_version_id) {
        const { data: version, error: versionError } = await db.from('obras_formularios_versoes').select('definicao').eq('id', data.current_version_id).single();
        if (versionError) throw versionError;
        data.draft_definicao = version.definicao;
      }
      return data as FormTemplate;
    },
  });
}

export function useSaveFormTemplate() {
  const queryClient = useQueryClient();
  const workspaceId = useObrasWorkspace();
  return useMutation({
    mutationFn: async (input: { id?: string; nome: string; descricao: string; tipo: string; definicao: FormDefinition }) => {
      if (!workspaceId) throw new Error('Não existe um workspace activo.');
      if (input.id) {
        const { error } = await db.from('obras_formularios').update({
          nome: input.nome, descricao: input.descricao || null, tipo: input.tipo,
          draft_definicao: input.definicao,
        }).eq('id', input.id).eq('workspace_id', workspaceId);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await db.from('obras_formularios').insert({
        workspace_id: workspaceId, nome: input.nome, descricao: input.descricao || null,
        tipo: input.tipo, draft_definicao: input.definicao,
      }).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['obras-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['obras-formulario', id] });
      toast({ title: 'Modelo guardado', description: 'O rascunho foi guardado com sucesso.' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível guardar', description: error.message, variant: 'destructive' }),
  });
}

export function usePublishFormTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: template, error: readError } = await db.from('obras_formularios')
        .select('draft_definicao').eq('id', id).single();
      if (readError) throw readError;
      if (!template?.draft_definicao) throw new Error('Guarde primeiro a definição do formulário.');
      const { error } = await db.rpc('publicar_obras_formulario', {
        p_formulario_id: id, p_definicao: template.draft_definicao,
      });
      if (error) throw error;
      const { error: clearError } = await db.from('obras_formularios')
        .update({ draft_definicao: null }).eq('id', id);
      if (clearError) throw clearError;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['obras-formularios'] });
      queryClient.invalidateQueries({ queryKey: ['obras-formulario', id] });
      toast({ title: 'Modelo publicado', description: 'Foi criada uma nova versão imutável.' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível publicar', description: error.message, variant: 'destructive' }),
  });
}

export function useArchiveFormTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('obras_formularios').update({ estado: 'arquivado' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras-formularios'] });
      toast({ title: 'Modelo arquivado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível arquivar', description: error.message, variant: 'destructive' }),
  });
}

export { emptyDefinition };

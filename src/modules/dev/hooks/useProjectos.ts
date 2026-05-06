import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from './useWorkspaceId';
import type { DevProjectoInsert } from '../types/dev';

export function useProjectos() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ['dev-projectos', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_projectos')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProjecto(id: string | undefined) {
  return useQuery({
    queryKey: ['dev-projecto', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_projectos')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProjecto() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: async (input: Omit<DevProjectoInsert, 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace');
      const { data, error } = await supabase
        .from('dev_projectos')
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dev-projectos'] }),
  });
}

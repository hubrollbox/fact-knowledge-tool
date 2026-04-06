import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import type { ProcessoInsert, ProcessoUpdate } from '../types/juridico';

function useWorkspaceId() {
  const { moduloActivo } = useModuloActivo();
  // workspace id is fetched via the workspace query
  const { data } = useQuery({
    queryKey: ['workspace-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });
  return data ?? null;
}

export function useProcessos() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: ['juridico_processos', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('juridico_processos')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useProcesso(id: string | undefined) {
  return useQuery({
    queryKey: ['juridico_processos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('juridico_processos')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProcesso() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: async (input: Omit<ProcessoInsert, 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase
        .from('juridico_processos')
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['juridico_processos'] });
    },
  });
}

export function useUpdateProcesso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProcessoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('juridico_processos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['juridico_processos'] });
      queryClient.invalidateQueries({ queryKey: ['juridico_processos', data.id] });
    },
  });
}

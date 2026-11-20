import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from './useWorkspaceId';
import type { DevIssueInsert } from '../types/dev';

export function useIssues(projectoId: string | undefined) {
  return useQuery({
    queryKey: ['dev-issues', projectoId],
    enabled: !!projectoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_issues')
        .select('*')
        .eq('projecto_id', projectoId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useIssuesAbertasCount() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ['dev-issues-abertas', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_issues')
        .select('projecto_id, estado')
        .eq('workspace_id', workspaceId!)
        .in('estado', ['aberto', 'em_progresso']);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const i of data ?? []) {
        counts[i.projecto_id] = (counts[i.projecto_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: async (input: Omit<DevIssueInsert, 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace');
      const { data, error } = await supabase
        .from('dev_issues')
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['dev-issues', vars.projecto_id] });
      qc.invalidateQueries({ queryKey: ['dev-issues-abertas'] });
    },
  });
}

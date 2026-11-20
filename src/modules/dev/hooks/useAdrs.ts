import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from './useWorkspaceId';
import type { DevAdrInsert } from '../types/dev';

export function useAdrs(projectoId: string | undefined) {
  return useQuery({
    queryKey: ['dev-adrs', projectoId],
    enabled: !!projectoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_adrs')
        .select('*')
        .eq('projecto_id', projectoId!)
        .order('numero', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdrsRecentes(limit = 5) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ['dev-adrs-recentes', workspaceId, limit],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dev_adrs')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAdr() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: async (input: Omit<DevAdrInsert, 'workspace_id' | 'numero'> & { numero?: number }) => {
      if (!workspaceId) throw new Error('Sem workspace');
      // Determinar próximo número para este projecto
      const { data: existing } = await supabase
        .from('dev_adrs')
        .select('numero')
        .eq('projecto_id', input.projecto_id)
        .order('numero', { ascending: false })
        .limit(1);
      const proximoNumero = (existing?.[0]?.numero ?? 0) + 1;

      const { data, error } = await supabase
        .from('dev_adrs')
        .insert({ ...input, numero: input.numero ?? proximoNumero, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['dev-adrs', vars.projecto_id] });
      qc.invalidateQueries({ queryKey: ['dev-adrs-recentes'] });
    },
  });
}

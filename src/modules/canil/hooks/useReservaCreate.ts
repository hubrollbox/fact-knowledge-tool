import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from './useWorkspaceId';
import type { Database } from '@/integrations/supabase/types';

type ReservaInsert = Database['public']['Tables']['canil_reservas']['Insert'];

export function useCreateReserva() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: async (input: Omit<ReservaInsert, 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase
        .from('canil_reservas')
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canil_reservas_hoje'] });
    },
  });
}

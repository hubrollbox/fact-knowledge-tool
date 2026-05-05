import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from './useWorkspaceId';

export function useReservasHoje() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ['canil_reservas_hoje', workspaceId],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('canil_reservas')
        .select('*, animal:canil_animais(id, nome, raca, foto_url)')
        .eq('workspace_id', workspaceId!)
        .or(`data_entrada.eq.${hoje},data_saida.eq.${hoje}`)
        .order('data_entrada');
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

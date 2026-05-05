import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from './useWorkspaceId';
import type { RegistoClinicoInsert } from '../types/canil';

export function useRegistosClinicos(animalId: string | undefined) {
  return useQuery({
    queryKey: ['canil_clinico', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canil_registos_clinicos')
        .select('*')
        .eq('animal_id', animalId!)
        .order('data_registo', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!animalId,
  });
}

export function useCreateRegistoClinico() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: async (input: Omit<RegistoClinicoInsert, 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase
        .from('canil_registos_clinicos')
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['canil_clinico', data.animal_id] });
      qc.invalidateQueries({ queryKey: ['canil_alertas_vacinas'] });
    },
  });
}

export function useAlertasVacinas() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ['canil_alertas_vacinas', workspaceId],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const limite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const { data, error } = await supabase
        .from('canil_registos_clinicos')
        .select('*, animal:canil_animais(id, nome, raca, foto_url)')
        .eq('workspace_id', workspaceId!)
        .not('data_proxima', 'is', null)
        .gte('data_proxima', hoje)
        .lte('data_proxima', limite)
        .order('data_proxima');
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from './useWorkspaceId';
import type { AnimalInsert, AnimalUpdate } from '../types/canil';

export function useAnimais() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ['canil_animais', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canil_animais')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('activo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useAnimal(id: string | undefined) {
  return useQuery({
    queryKey: ['canil_animal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canil_animais')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAnimal() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation({
    mutationFn: async (input: Omit<AnimalInsert, 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase
        .from('canil_animais')
        .insert({ ...input, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['canil_animais'] }),
  });
}

export function useUpdateAnimal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: AnimalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('canil_animais')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['canil_animais'] });
      qc.invalidateQueries({ queryKey: ['canil_animal', data.id] });
    },
  });
}

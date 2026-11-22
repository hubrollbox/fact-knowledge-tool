import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const NINHADAS_DO_ANIMAL_SELECT =
  '*, mae:canil_animais!canil_ninhadas_workspace_mae_fkey(id, nome), pai:canil_animais!canil_ninhadas_workspace_pai_fkey(id, nome)';

export function useNinhadasDoAnimal(animalId: string | undefined) {
  return useQuery({
    queryKey: ['canil_ninhadas_animal', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canil_ninhadas')
        .select(NINHADAS_DO_ANIMAL_SELECT)
        .or(`mae_id.eq.${animalId},pai_id.eq.${animalId}`)
        .order('data_parto', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!animalId,
  });
}

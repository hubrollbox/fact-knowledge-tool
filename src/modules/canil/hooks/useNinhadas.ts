import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CANIL_NINHADAS_SELECT } from '../contracts';

export function useNinhadasDoAnimal(animalId: string | undefined) {
  return useQuery({
    queryKey: ['canil_ninhadas_animal', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canil_ninhadas')
        .select(CANIL_NINHADAS_SELECT)
        .or(`mae_id.eq.${animalId},pai_id.eq.${animalId}`)
        .order('data_parto', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!animalId,
  });
}

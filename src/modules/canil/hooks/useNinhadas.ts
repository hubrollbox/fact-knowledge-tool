import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNinhadasDoAnimal(animalId: string | undefined) {
  return useQuery({
    queryKey: ['canil_ninhadas_animal', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canil_ninhadas')
        .select('*, mae:canil_animais!canil_ninhadas_mae_id_fkey(id, nome), pai:canil_animais!canil_ninhadas_pai_id_fkey(id, nome)')
        .or(`mae_id.eq.${animalId},pai_id.eq.${animalId}`)
        .order('data_parto', { ascending: false });
      if (error) {
        // fallback caso os FK names não existam
        const { data: d2, error: e2 } = await supabase
          .from('canil_ninhadas')
          .select('*')
          .or(`mae_id.eq.${animalId},pai_id.eq.${animalId}`)
          .order('data_parto', { ascending: false });
        if (e2) throw e2;
        return d2;
      }
      return data;
    },
    enabled: !!animalId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

export function usePrazos(processoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico_prazos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('juridico_prazos')
        .select('*')
        .eq('processo_id', processoId!)
        .order('data_limite', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!processoId,
  });
}

export function usePrazosUrgentes() {
  const limiteStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['juridico_prazos_urgentes', limiteStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('juridico_prazos')
        .select('*, juridico_processos(titulo)')
        .eq('estado', 'pendente')
        .lte('data_limite', limiteStr)
        .order('data_limite', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

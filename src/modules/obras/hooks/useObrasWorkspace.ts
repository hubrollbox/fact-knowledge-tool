import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useObrasWorkspace() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  return data?.id ?? null;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWorkspaceId() {
  const { data } = useQuery({
    queryKey: ['workspace-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });
  return data ?? null;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useObrasWorkspace() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      const { data: owned, error: ownerError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (ownerError) throw ownerError;
      if (owned) return owned;

      const { data: membership, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!membership) return null;
      const { data: memberWorkspace, error: memberWorkspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', membership.workspace_id)
        .maybeSingle();
      if (memberWorkspaceError) throw memberWorkspaceError;
      return memberWorkspace;
    },
    enabled: !!user,
  });
  return data?.id ?? null;
}

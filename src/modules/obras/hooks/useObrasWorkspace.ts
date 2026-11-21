import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const workspaceCacheKey = (userId: string) => 'fkt:works:workspace:' + userId;

function isNetworkFailure(error: unknown) {
  if (!navigator.onLine) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|offline|timeout/i.test(message);
}

export function useObrasWorkspace() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data: owned, error: ownerError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (ownerError) throw ownerError;
        if (owned) {
          localStorage.setItem(workspaceCacheKey(user.id), owned.id);
          return owned;
        }

        const { data: membership, error: memberError } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
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
        if (memberWorkspace) localStorage.setItem(workspaceCacheKey(user.id), memberWorkspace.id);
        return memberWorkspace;
      } catch (error) {
        if (!isNetworkFailure(error)) throw error;
        const cachedId = localStorage.getItem(workspaceCacheKey(user.id));
        if (!cachedId) throw new Error('Este dispositivo ainda não tem um espaço de trabalho preparado para utilização offline.');
        return { id: cachedId };
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  return data?.id ?? null;
}

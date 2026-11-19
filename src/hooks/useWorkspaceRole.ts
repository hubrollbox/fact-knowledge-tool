import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer' | null;

export function useWorkspaceRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-role', user?.id],
    queryFn: async (): Promise<WorkspaceRole> => {
      if (!user) return null;
      const { data: ws, error: workspaceError } = await supabase
        .from('workspaces').select('id, user_id').eq('user_id', user.id).maybeSingle();
      if (workspaceError) throw workspaceError;
      if (ws) return 'owner';
      const { data: m, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (membershipError) throw membershipError;
      return (m?.role as WorkspaceRole) ?? null;
    },
    enabled: !!user,
  });

  const role = data ?? null;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const canWrite = isAdmin || role === 'editor';

  return { role, isOwner, isAdmin, canWrite, isLoading };
}

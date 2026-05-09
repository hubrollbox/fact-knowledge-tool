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
      const { data: ws } = await supabase
        .from('workspaces').select('id, user_id').eq('user_id', user.id).maybeSingle();
      if (ws) return 'owner';
      const { data: m } = await supabase
        .from('workspace_members').select('role').eq('user_id', user.id).maybeSingle();
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

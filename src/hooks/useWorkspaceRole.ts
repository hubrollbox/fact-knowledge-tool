import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuloActivo } from '@/hooks/useModuloActivo';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer' | null;

/** Resolve the role for the active workspace, not the first workspace found for the account. */
export function useWorkspaceRole() {
  const { user } = useAuth();
  const { workspace } = useModuloActivo();
  const workspaceId = workspace?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-role', workspaceId, user?.id],
    queryFn: async (): Promise<WorkspaceRole> => {
      if (!user || !workspaceId) return null;
      if (workspace?.user_id === user.id) return 'owner';

      const { data: membership, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return (membership?.role as WorkspaceRole) ?? null;
    },
    enabled: !!user && !!workspaceId,
  });

  const role = data ?? null;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const canWrite = isAdmin || role === 'editor';

  return { role, isOwner, isAdmin, canWrite, isLoading };
}

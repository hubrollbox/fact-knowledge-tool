import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ModuloSlug } from '@/types/modulos';
import { modulos } from '@/data/modulos';
import { toast } from '@/hooks/use-toast';

export function useModuloActivo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // First look for a workspace owned by this user.
      const { data: ownWorkspace, error: ownError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownError) throw ownError;
      if (ownWorkspace) return ownWorkspace;

      // If the user is a member, use that workspace instead of creating a second one.
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (membership) {
        const { data: memberWorkspace, error: memberWorkspaceError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', membership.workspace_id)
          .maybeSingle();

        if (memberWorkspaceError) throw memberWorkspaceError;
        return memberWorkspace;
      }

      return null;
    },
    enabled: !!user,
  });

  const moduloActivo = workspace
    ? modulos.find((m) => m.slug === workspace.modulo) ?? null
    : null;

  const setModulo = useMutation({
    mutationFn: async (slug: ModuloSlug) => {
      if (!user) throw new Error('Não autenticado');

      if (workspace) {
        const { error } = await supabase
          .from('workspaces')
          .update({ modulo: slug })
          .eq('id', workspace.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workspaces')
          .insert({ user_id: user.id, modulo: slug });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', user?.id] });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível alterar o módulo.', variant: 'destructive' });
    },
  });

  return {
    moduloActivo,
    moduloSlug: (workspace?.modulo as ModuloSlug) ?? null,
    isLoading,
    setModulo: setModulo.mutateAsync,
    isChanging: setModulo.isPending,
  };
}

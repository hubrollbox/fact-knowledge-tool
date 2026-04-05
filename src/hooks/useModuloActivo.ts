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
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
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
    setModulo: setModulo.mutate,
    isChanging: setModulo.isPending,
  };
}

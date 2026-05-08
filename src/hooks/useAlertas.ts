import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import { Tables } from '@/integrations/supabase/types';

export type Alerta = Tables<'alertas'>;
export type AlertaModulo = 'juridico' | 'canil' | 'dev';

export function useAlertas() {
  const { user } = useAuth();

  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const query = useQuery({
    queryKey: ['alertas', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [] as Alerta[];
      const { data, error } = await supabase
        .from('alertas')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('lido', false)
        .order('data_alerta', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Alerta[];
    },
    enabled: !!workspace?.id,
  });

  const alertas = query.data ?? [];
  const grupos: Record<AlertaModulo, Alerta[]> = {
    juridico: alertas.filter((a) => a.modulo === 'juridico'),
    canil: alertas.filter((a) => a.modulo === 'canil'),
    dev: alertas.filter((a) => a.modulo === 'dev'),
  };

  return {
    alertas,
    grupos,
    total: alertas.length,
    isLoading: query.isLoading,
    workspaceId: workspace?.id ?? null,
  };
}

export function useMarcarLido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alertas')
        .update({ lido: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    },
  });
}

/** Resolve a route for a given alerta based on its referencia_tipo. */
export function rotaParaAlerta(a: Alerta): string {
  switch (a.referencia_tipo) {
    case 'juridico_prazos':
    case 'juridico_processos':
      return a.referencia_id ? `/juridico/processo/${a.referencia_id}` : '/juridico';
    case 'canil_registos_clinicos':
    case 'canil_animais':
      return a.referencia_id ? `/canil/animal/${a.referencia_id}` : '/canil';
    case 'canil_reservas':
      return '/canil/agenda';
    case 'dev_issues':
    case 'dev_projectos':
    case 'dev_adrs':
      return a.referencia_id ? `/dev/projecto/${a.referencia_id}` : '/dev';
    default:
      return '/dashboard';
  }
}

// Helper for module code: insert an alert.
export async function criarAlerta(input: {
  workspace_id: string;
  user_id?: string | null;
  modulo: AlertaModulo;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  data_alerta?: string | null;
  referencia_id?: string | null;
  referencia_tipo?: string | null;
}) {
  const { error } = await supabase.from('alertas').insert(input);
  if (error) throw error;
}

// silence unused import lint when not consumed elsewhere
void useModuloActivo;

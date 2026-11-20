import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useObrasWorkspace } from '@/modules/obras/hooks/useObrasWorkspace';
import { Tables } from '@/integrations/supabase/types';

export type Alerta = Tables<'alertas'>;
export type AlertaModulo = 'juridico' | 'canil' | 'dev' | 'obras';

export function useAlertas() {
  const workspaceId = useObrasWorkspace();
  const query = useQuery({
    queryKey: ['alertas', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as Alerta[];
      const { data, error } = await supabase
        .from('alertas')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('lido', false)
        .order('data_alerta', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Alerta[];
    },
    enabled: !!workspaceId,
  });

  const alertas = query.data ?? [];
  const grupos: Record<AlertaModulo, Alerta[]> = {
    juridico: alertas.filter((a) => a.modulo === 'juridico'),
    canil: alertas.filter((a) => a.modulo === 'canil'),
    dev: alertas.filter((a) => a.modulo === 'dev'),
    obras: alertas.filter((a) => a.modulo === 'obras'),
  };

  return {
    alertas,
    grupos,
    total: alertas.length,
    isLoading: query.isLoading,
    workspaceId,
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
    case 'obras_acoes':
      return '/obras/acoes';
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


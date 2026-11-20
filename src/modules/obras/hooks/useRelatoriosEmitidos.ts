import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RelatorioEmitido {
  id: string;
  workspace_id: string;
  obra_id: string;
  visita_id: string;
  numero_versao: number;
  relatorio_anterior_id: string | null;
  estado: 'rascunho' | 'emitido';
  emitido_em: string;
  emitido_por: string;
  snapshot: Record<string, unknown>;
}

export function useRelatoriosEmitidos(visitaId?: string) {
  return useQuery({
    queryKey: ['obras_relatorios_emitidos', visitaId],
    enabled: !!visitaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('obras_relatorios_emitidos')
        .select('id, workspace_id, obra_id, visita_id, numero_versao, relatorio_anterior_id, estado, emitido_em, emitido_por, snapshot')
        .eq('visita_id', visitaId!)
        .order('numero_versao', { ascending: false });
      if (error) throw error;
      return data as RelatorioEmitido[];
    },
  });
}

export function useEmitirRelatorioVisita(visitaId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snapshot: Record<string, unknown>) => {
      if (!visitaId) throw new Error('Visita não identificada');
      const { data, error } = await (supabase as any).rpc('emitir_relatorio_visita', {
        p_visita_id: visitaId,
        p_snapshot: snapshot,
      }).single();
      if (error) throw error;
      return data as RelatorioEmitido;
    },
    onSuccess: (relatorio) => {
      qc.invalidateQueries({ queryKey: ['obras_relatorios_emitidos', visitaId] });
      toast({ title: `Relatório emitido — versão ${relatorio.numero_versao}` });
    },
    onError: (error: Error) => toast({
      title: 'Não foi possível emitir o relatório',
      description: error.message,
      variant: 'destructive',
    }),
  });
}

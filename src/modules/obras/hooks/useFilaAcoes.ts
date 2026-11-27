import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useObrasWorkspace } from './useObrasWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type AcaoFila = {
  id: string;
  obra_id: string;
  ocorrencia_id: string | null;
  workspace_id: string;
  descricao: string;
  responsavel: string | null;
  responsavel_user_id: string | null;
  prazo: string | null;
  estado: string;
  prioridade: string;
  visita_id: string | null;
  created_at: string;
  obras: { nome: string } | null;
  obras_ocorrencias: { id: string; titulo: string; estado: string } | null;
  analise: { interpretacao: string | null; conclusao: string | null; recomendacao: string | null } | null;
};

export function useFilaAcoes() {
  const workspaceId = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['obras_fila_acoes', workspaceId],
    enabled: !!workspaceId && !!user,
    queryFn: async () => {
      // Alertas gerados ao consultar a fila, sem depender de um serviço cron externo.
      const { error: alertError } = await (supabase as any).rpc('sincronizar_alertas_obras_acoes');
      if (alertError) throw alertError;

      const { data, error } = await (supabase as any)
        .from('obras_acoes')
        .select('*, obras(nome), obras_ocorrencias(id, titulo, estado)')
        .eq('workspace_id', workspaceId!)
        .order('prazo', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const occurrenceIds: string[] = [...new Set<string>(rows.map((a: any) => a.ocorrencia_id as string | null).filter((id): id is string => Boolean(id)))];
      let analyses: any[] = [];
      if (occurrenceIds.length) {
        const result = await supabase.from('obras_ocorrencia_analises')
          .select('ocorrencia_id, interpretacao, conclusao, recomendacao')
          .in('ocorrencia_id', occurrenceIds);
        if (result.error) throw result.error;
        analyses = result.data ?? [];
      }
      const byOccurrence = new Map(analyses.map((a) => [a.ocorrencia_id, a]));
      return rows.map((a: any) => ({ ...a, analise: byOccurrence.get(a.ocorrencia_id) ?? null })) as AcaoFila[];
    },
  });
}

export function useMembrosFilaAcoes() {
  const workspaceId = useObrasWorkspace();
  return useQuery({
    queryKey: ['obras_fila_membros', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const [{ data, error }, { data: workspace, error: ownerError }] = await Promise.all([
        supabase.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId!),
        supabase.from('workspaces').select('user_id').eq('id', workspaceId!).maybeSingle(),
      ]);
      if (error) throw error;
      if (ownerError) throw ownerError;
      const members = data ?? [];
      if (workspace?.user_id && !members.some(m => m.user_id === workspace.user_id)) {
        members.unshift({ user_id: workspace.user_id, role: 'owner' });
      }
      return members.filter(m => ['owner','admin','editor'].includes(m.role));
    },
  });
}

export function useAtribuirAcao() {
  const qc = useQueryClient();
  const workspaceId = useObrasWorkspace();
  return useMutation({
    mutationFn: async ({ id, responsavel_user_id, responsavel }: {
      id: string; responsavel_user_id: string | null; responsavel: string | null;
    }) => {
      const { error } = await (supabase as any).from('obras_acoes')
        .update({ responsavel_user_id, responsavel }).eq('workspace_id', workspaceId!).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras_fila_acoes'] });
      qc.invalidateQueries({ queryKey: ['obras_acoes'] });
      toast({ title: 'Responsável actualizado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível atribuir a acção', description: error.message, variant: 'destructive' }),
  });
}

export function useOcorrenciasComLacunas() {
  const workspaceId = useObrasWorkspace();
  return useQuery({
    queryKey: ['obras_ocorrencias_lacunas', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from('obras_ocorrencias')
        .select('id, obra_id, titulo, estado, workspace_id, obras(nome)')
        .eq('workspace_id', workspaceId!)
        .neq('estado', 'resolvida')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];
      const { data: analyses, error: analysisError } = await supabase.from('obras_ocorrencia_analises')
        .select('ocorrencia_id, interpretacao, conclusao, recomendacao')
        .in('ocorrencia_id', rows.map(r => r.id));
      if (analysisError) throw analysisError;
      const byId = new Map((analyses ?? []).map(a => [a.ocorrencia_id, a]));
      return rows.map(r => ({ ...r, analise: byId.get(r.id) ?? null })).filter(r =>
        !r.analise || (!r.analise.interpretacao && !r.analise.conclusao && !r.analise.recomendacao)
        || !r.analise.conclusao || !r.analise.recomendacao
      );
    },
  });
}

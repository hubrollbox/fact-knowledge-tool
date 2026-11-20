import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AttachedDisciplina {
  link_id: string;
  id: string;
  nome: string;
  descricao: string | null;
}

export function useDossierDisciplinas(dossierId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const attached = useQuery({
    queryKey: ['dossier-disciplinas', dossierId],
    queryFn: async (): Promise<AttachedDisciplina[]> => {
      if (!dossierId) return [];
      const { data, error } = await supabase
        .from('disciplina_processos')
        .select('id, disciplina:disciplinas(id, nome, descricao)')
        .eq('dossier_id', dossierId);
      if (error) throw error;
      return (data || []).flatMap((r: any) =>
        r.disciplina ? [{ link_id: r.id, id: r.disciplina.id, nome: r.disciplina.nome, descricao: r.disciplina.descricao }] : []
      );
    },
    enabled: !!dossierId,
  });

  const allDisciplinas = useQuery({
    queryKey: ['all-disciplinas', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('disciplinas').select('id, nome').eq('user_id', user.id).order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const attach = useMutation({
    mutationFn: async (disciplinaId: string) => {
      if (!dossierId) throw new Error('Dossier inválido');
      const { error } = await supabase
        .from('disciplina_processos')
        .insert({ dossier_id: dossierId, disciplina_id: disciplinaId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossier-disciplinas', dossierId] });
      toast.success('Disciplina associada');
    },
    onError: () => toast.error('Erro ao associar disciplina'),
  });

  const detach = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('disciplina_processos').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossier-disciplinas', dossierId] });
      toast.success('Associação removida');
    },
    onError: () => toast.error('Erro ao remover associação'),
  });

  return {
    disciplinas: attached.data ?? [],
    isLoading: attached.isLoading,
    allDisciplinas: allDisciplinas.data ?? [],
    attach: attach.mutate,
    detach: detach.mutate,
  };
}

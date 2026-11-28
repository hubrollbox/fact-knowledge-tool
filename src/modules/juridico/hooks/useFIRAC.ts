import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import type {
  ParteInsert, FactoInsert, QuestaoInsert, FonteInsert, AplicacaoInsert, ConclusaoInsert,
} from '../types/juridico';

function useWorkspaceId() {
  const { workspace } = useModuloActivo();
  return workspace?.id ?? null;
}

export function usePartes(processoId: string) {
  return useQuery({
    queryKey: ['juridico_partes', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_partes').select('*')
        .eq('processo_id', processoId).order('nome');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useCreateParte(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ParteInsert, 'processo_id' | 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase.from('juridico_partes')
        .insert({ ...input, processo_id: processoId, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_partes', processoId] }),
  });
}

export function useDeleteParte(processoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('juridico_partes').delete().eq('id', id).eq('processo_id', processoId).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Não tem permissões para remover esta parte');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_partes', processoId] }),
  });
}

export function useFactos(processoId: string) {
  return useQuery({
    queryKey: ['juridico_factos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_factos').select('*')
        .eq('processo_id', processoId).order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useCreateFacto(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FactoInsert, 'processo_id' | 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase.from('juridico_factos')
        .insert({ ...input, processo_id: processoId, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_factos', processoId] }),
  });
}

export function useDeleteFacto(processoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('juridico_factos').delete().eq('id', id).eq('processo_id', processoId).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Não tem permissões para remover este facto');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juridico_factos', processoId] });
      qc.invalidateQueries({ queryKey: ['juridico_factos_documentos', processoId] });
      qc.invalidateQueries({ queryKey: ['juridico_questoes_factos', processoId] });
      qc.invalidateQueries({ queryKey: ['juridico_aplicacoes_factos', processoId] });
    },
  });
}

export function useFactosDocumentos(processoId: string) {
  return useQuery({
    queryKey: ['juridico_factos_documentos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_factos_documentos')
        .select('facto_id, documento_id, notas').eq('processo_id', processoId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useLinkFactoDocumento(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ factoId, documentoId }: { factoId: string; documentoId: string }) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { error } = await supabase.from('juridico_factos_documentos').insert({
        facto_id: factoId, documento_id: documentoId, processo_id: processoId, workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_factos_documentos', processoId] }),
  });
}

export function useUnlinkFactoDocumento(processoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ factoId, documentoId }: { factoId: string; documentoId: string }) => {
      const { data, error } = await supabase.from('juridico_factos_documentos').delete()
        .eq('facto_id', factoId).eq('documento_id', documentoId).eq('processo_id', processoId).select('facto_id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Não tem permissões para desligar esta evidência');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_factos_documentos', processoId] }),
  });
}

export function useQuestoes(processoId: string) {
  return useQuery({
    queryKey: ['juridico_questoes', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_questoes').select('*')
        .eq('processo_id', processoId).order('ordem').order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useCreateQuestao(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<QuestaoInsert, 'processo_id' | 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase.from('juridico_questoes')
        .insert({ ...input, processo_id: processoId, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_questoes', processoId] }),
  });
}

export function useQuestaoFactos(processoId: string) {
  return useQuery({
    queryKey: ['juridico_questoes_factos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_questoes_factos')
        .select('questao_id, facto_id').eq('processo_id', processoId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useLinkQuestaoFacto(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questaoId, factoId }: { questaoId: string; factoId: string }) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { error } = await supabase.from('juridico_questoes_factos').insert({
        questao_id: questaoId, facto_id: factoId, processo_id: processoId, workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_questoes_factos', processoId] }),
  });
}

export function useUnlinkQuestaoFacto(processoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questaoId, factoId }: { questaoId: string; factoId: string }) => {
      const { data, error } = await supabase.from('juridico_questoes_factos').delete()
        .eq('questao_id', questaoId).eq('facto_id', factoId).eq('processo_id', processoId).select('questao_id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Não tem permissões para desligar este facto');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_questoes_factos', processoId] }),
  });
}

export function useFontes(processoId: string) {
  return useQuery({
    queryKey: ['juridico_fontes', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_fontes').select('*')
        .eq('processo_id', processoId).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useCreateFonte(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FonteInsert, 'processo_id' | 'workspace_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase.from('juridico_fontes')
        .insert({ ...input, processo_id: processoId, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_fontes', processoId] }),
  });
}

export function useQuestaoFontes(processoId: string) {
  return useQuery({
    queryKey: ['juridico_questoes_fontes', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_questoes_fontes')
        .select('questao_id, fonte_id, segmento_aplicavel').eq('processo_id', processoId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useLinkQuestaoFonte(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questaoId, fonteId, segmento }: { questaoId: string; fonteId: string; segmento?: string }) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { error } = await supabase.from('juridico_questoes_fontes').insert({
        questao_id: questaoId, fonte_id: fonteId, segmento_aplicavel: segmento ?? null,
        processo_id: processoId, workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_questoes_fontes', processoId] }),
  });
}

export function useUnlinkQuestaoFonte(processoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questaoId, fonteId }: { questaoId: string; fonteId: string }) => {
      const { data, error } = await supabase.from('juridico_questoes_fontes').delete()
        .eq('questao_id', questaoId).eq('fonte_id', fonteId).eq('processo_id', processoId).select('questao_id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Não tem permissões para desligar esta fonte');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_questoes_fontes', processoId] }),
  });
}

export function useAplicacoes(processoId: string) {
  return useQuery({
    queryKey: ['juridico_aplicacoes', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_aplicacoes').select('*')
        .eq('processo_id', processoId).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useCreateAplicacao(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AplicacaoInsert, 'processo_id' | 'workspace_id' | 'autor_id'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase.from('juridico_aplicacoes')
        .insert({ ...input, processo_id: processoId, workspace_id: workspaceId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_aplicacoes', processoId] }),
  });
}

export function useAplicacaoFactos(processoId: string) {
  return useQuery({
    queryKey: ['juridico_aplicacoes_factos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_aplicacoes_factos')
        .select('aplicacao_id, facto_id, notas').eq('processo_id', processoId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useLinkAplicacaoFacto(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ aplicacaoId, questaoId, factoId }: { aplicacaoId: string; questaoId: string; factoId: string }) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { error } = await supabase.from('juridico_aplicacoes_factos').insert({
        aplicacao_id: aplicacaoId, questao_id: questaoId, facto_id: factoId,
        processo_id: processoId, workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_aplicacoes_factos', processoId] }),
  });
}

export function useAplicacaoFontes(processoId: string) {
  return useQuery({
    queryKey: ['juridico_aplicacoes_fontes', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_aplicacoes_fontes')
        .select('aplicacao_id, fonte_id, segmento_aplicavel, notas').eq('processo_id', processoId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useLinkAplicacaoFonte(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ aplicacaoId, questaoId, fonteId }: { aplicacaoId: string; questaoId: string; fonteId: string }) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { error } = await supabase.from('juridico_aplicacoes_fontes').insert({
        aplicacao_id: aplicacaoId, questao_id: questaoId, fonte_id: fonteId,
        processo_id: processoId, workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['juridico_aplicacoes_fontes', processoId] }),
  });
}

export function useConclusoes(processoId: string) {
  return useQuery({
    queryKey: ['juridico_conclusoes', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_conclusoes').select('*')
        .eq('processo_id', processoId).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useConclusaoSnapshots(processoId: string) {
  return useQuery({
    queryKey: ['juridico_conclusoes_snapshots', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_conclusoes_snapshots')
        .select('*').eq('processo_id', processoId).order('captured_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useConclusaoEventos(processoId: string) {
  return useQuery({
    queryKey: ['juridico_conclusoes_eventos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('juridico_conclusoes_eventos')
        .select('*').eq('processo_id', processoId).order('created_at', { ascending: true }).order('id', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!processoId,
  });
}

export function useTransicaoConclusao(processoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conclusaoId, novoEstado, notas }: {
      conclusaoId: string;
      novoEstado: 'rascunho' | 'em_revisao' | 'final';
      notas?: string;
    }) => {
      const { data, error } = await supabase.rpc('transition_juridico_conclusao', {
        _conclusao_id: conclusaoId,
        _novo_estado: novoEstado,
        _notas: notas ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juridico_conclusoes', processoId] });
      qc.invalidateQueries({ queryKey: ['juridico_conclusoes_eventos', processoId] });
    },
  });
}

export function useCreateConclusao(processoId: string) {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Pick<ConclusaoInsert, 'questao_id' | 'aplicacao_id' | 'texto'>) => {
      if (!workspaceId) throw new Error('Sem workspace activo');
      const { data, error } = await supabase.rpc('create_juridico_conclusao_version', {
        _processo_id: processoId,
        _workspace_id: workspaceId,
        _questao_id: input.questao_id ?? null,
        _aplicacao_id: input.aplicacao_id ?? null,
        _texto: input.texto,
        _estado: 'rascunho',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juridico_conclusoes', processoId] });
      qc.invalidateQueries({ queryKey: ['juridico_conclusoes_eventos', processoId] });
    },
  });
}

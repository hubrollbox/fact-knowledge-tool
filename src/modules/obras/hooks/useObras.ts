import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useObrasWorkspace } from './useObrasWorkspace';
import type { ObraInsert, VisitaInsert, OcorrenciaInsert, AcaoInsert } from '../types/obras';

const onErr = (e: Error) => toast({ title: 'Não foi guardado', description: e.message, variant: 'destructive' });

export function useObras() {
  const ws = useObrasWorkspace();
  return useQuery({
    queryKey: ['obras', ws],
    enabled: !!ws,
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('*').eq('workspace_id', ws!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useObra(id?: string) {
  return useQuery({
    queryKey: ['obra', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useVisitas(obraId?: string) {
  return useQuery({ queryKey: ['obras_visitas', obraId], enabled: !!obraId, queryFn: async () => {
    const { data, error } = await supabase.from('obras_visitas').select('*').eq('obra_id', obraId!).order('data_visita', { ascending: false });
    if (error) throw error; return data;
  } });
}
export function useOcorrencias(obraId?: string) {
  return useQuery({ queryKey: ['obras_ocorrencias', obraId], enabled: !!obraId, queryFn: async () => {
    const { data, error } = await supabase.from('obras_ocorrencias').select('*').eq('obra_id', obraId!).order('created_at', { ascending: false });
    if (error) throw error; return data;
  } });
}

export function useOcorrencia(obraId?: string, ocorrenciaId?: string) {
  return useQuery({
    queryKey: ['obras_ocorrencia', obraId, ocorrenciaId],
    enabled: !!obraId && !!ocorrenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras_ocorrencias')
        .select('*')
        .eq('obra_id', obraId!)
        .eq('id', ocorrenciaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAcoes(obraId?: string) {
  return useQuery({ queryKey: ['obras_acoes', obraId], enabled: !!obraId, queryFn: async () => {
    const { data, error } = await supabase.from('obras_acoes').select('*').eq('obra_id', obraId!).order('created_at', { ascending: false });
    if (error) throw error; return data;
  } });
}

export function useVisita(id?: string) {
  return useQuery({
    queryKey: ['obras_visita', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('obras_visitas').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useOcorrenciasAbertas() {
  const ws = useObrasWorkspace();
  return useQuery({
    queryKey: ['obras_ocorrencias_abertas', ws],
    enabled: !!ws,
    queryFn: async () => {
      const { data, error } = await supabase.from('obras_ocorrencias').select('*, obras(nome)').eq('workspace_id', ws!).neq('estado', 'resolvida').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarObra() {
  const ws = useObrasWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Omit<ObraInsert, 'workspace_id'>) => {
      if (!ws) throw new Error('Sem espaço de trabalho');
      const { data, error } = await supabase.from('obras').insert({ ...v, workspace_id: ws }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obras'] }),
    onError: onErr,
  });
}

function useInsert<K extends 'obras_visitas' | 'obras_ocorrencias' | 'obras_acoes'>(table: K) {
  const ws = useObrasWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Omit<K extends 'obras_visitas' ? VisitaInsert : K extends 'obras_ocorrencias' ? OcorrenciaInsert : AcaoInsert, 'workspace_id'>) => {
      if (!ws) throw new Error('Sem espaço de trabalho');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.from(table).insert({ ...(v as any), workspace_id: ws }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table] }); qc.invalidateQueries({ queryKey: ['obras_ocorrencias_abertas'] }); },
    onError: onErr,
  });
}
export const useCriarVisita = () => useInsert('obras_visitas');
export const useCriarOcorrencia = () => useInsert('obras_ocorrencias');
export const useCriarAcao = () => useInsert('obras_acoes');

export function useActualizarEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ table, id, estado }: { table: 'obras_ocorrencias' | 'obras_acoes' | 'obras'; id: string; estado: string }) => {
      const { error } = await supabase.from(table).update({ estado }).eq('id', id);
      if (error) throw error;
      return table;
    },
    onSuccess: (t) => { qc.invalidateQueries({ queryKey: [t] }); qc.invalidateQueries({ queryKey: ['obra'] }); qc.invalidateQueries({ queryKey: ['obras_ocorrencias_abertas'] }); qc.invalidateQueries({ queryKey: ['obras_fila_acoes'] }); },
    onError: onErr,
  });
}

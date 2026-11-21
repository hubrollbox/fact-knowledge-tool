import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useObrasWorkspace } from './useObrasWorkspace';
import type { ObraInsert, VisitaInsert, OcorrenciaInsert, AcaoInsert } from '../types/obras';
import { useAuth } from '@/contexts/AuthContext';
import { criarOperacaoOffline, guardarOperacaoOffline, isFalhaDeLigacao, listarOperacoesOffline, guardarSnapshotOffline, obterSnapshotOffline } from '../offline/offlineStore';

const onErr = (e: Error) => toast({ title: 'Não foi guardado', description: e.message, variant: 'destructive' });

export function useObras() {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['obras', ws],
    enabled: !!ws,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('obras').select('*').eq('workspace_id', ws!).order('created_at', { ascending: false });
        if (error) throw error;
        if (user?.id) await guardarSnapshotOffline({ userId: user.id, workspaceId: ws!, obraId: '__lista__', entity: 'obra', data });
        return data;
      } catch (error) {
        if (!isFalhaDeLigacao(error) || !user?.id) throw error;
        return await obterSnapshotOffline<typeof error extends never ? never : any[]>(user.id, ws!, '__lista__', 'obra') ?? [];
      }
    },
  });
}

export function useObra(id?: string) {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['obra', id],
    enabled: !!id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('obras').select('*').eq('id', id!).maybeSingle();
        if (error) throw error;
        if (data && user?.id && ws) await guardarSnapshotOffline({ userId: user.id, workspaceId: ws, obraId: id!, entity: 'obra', data });
        return data;
      } catch (error) {
        if (!isFalhaDeLigacao(error) || !user?.id || !ws) throw error;
        return await obterSnapshotOffline<any>(user.id, ws, id!, 'obra');
      }
    },
  });
}

export function useVisitas(obraId?: string) {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({ queryKey: ['obras_visitas', obraId], enabled: !!obraId, queryFn: async () => {
    let remote: any[] = [];
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.from('obras_visitas').select('*').eq('obra_id', obraId!).order('data_visita', { ascending: false });
        if (error) throw error;
        remote = data ?? [];
      } catch (error) {
        if (!isFalhaDeLigacao(error)) throw error;
      }
    }
    if (!user?.id || !ws) return remote;
    const pending = await listarOperacoesOffline(user.id, ws);
    const local = pending.filter((op) => op.entity === 'visita' && op.payload.obra_id === obraId).map((op) => op.payload);
    return [...local, ...remote.filter((row) => !local.some((item) => item.id === row.id))].sort((a, b) => String(b.data_visita).localeCompare(String(a.data_visita)));
  } });
}
export function useOcorrencias(obraId?: string) {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({ queryKey: ['obras_ocorrencias', obraId], enabled: !!obraId, queryFn: async () => {
    let remote: any[] = [];
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.from('obras_ocorrencias').select('*').eq('obra_id', obraId!).order('created_at', { ascending: false });
        if (error) throw error;
        remote = data ?? [];
      } catch (error) {
        if (!isFalhaDeLigacao(error)) throw error;
      }
    }
    if (!user?.id || !ws) return remote;
    const pending = await listarOperacoesOffline(user.id, ws);
    const local = pending.filter((op) => op.entity === 'ocorrencia' && op.payload.obra_id === obraId).map((op) => op.payload);
    return [...local, ...remote.filter((row) => !local.some((item) => item.id === row.id))].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  } });
}

export function useOcorrencia(obraId?: string, ocorrenciaId?: string) {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['obras_ocorrencia', obraId, ocorrenciaId],
    enabled: !!obraId && !!ocorrenciaId,
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase.from('obras_ocorrencias').select('*').eq('obra_id', obraId!).eq('id', ocorrenciaId!).maybeSingle();
          if (error) throw error;
          if (data) return data;
        } catch (error) {
          if (!isFalhaDeLigacao(error)) throw error;
        }
      }
      if (!user?.id || !ws) return null;
      const pending = await listarOperacoesOffline(user.id, ws);
      const item = pending.find((op) => op.entity === 'ocorrencia' && op.payload.id === ocorrenciaId);
      return item?.payload as any ?? null;
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
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['obras_visita', id],
    enabled: !!id,
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase.from('obras_visitas').select('*').eq('id', id!).maybeSingle();
          if (error) throw error;
          if (data) return data;
        } catch (error) {
          if (!isFalhaDeLigacao(error)) throw error;
        }
      }
      if (!user?.id || !ws) return null;
      const pending = await listarOperacoesOffline(user.id, ws);
      const item = pending.find((op) => op.entity === 'visita' && op.payload.id === id);
      return item?.payload as any ?? null;
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
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Omit<K extends 'obras_visitas' ? VisitaInsert : K extends 'obras_ocorrencias' ? OcorrenciaInsert : AcaoInsert, 'workspace_id'>) => {
      if (!ws || !user?.id) throw new Error('Sem espaço de trabalho ou sessão válida');
      // Generate the identifier before either path so retries cannot create duplicates.
      const payload = { ...(v as any), id: (v as any).id ?? crypto.randomUUID(), workspace_id: ws };
      const entity = table === 'obras_visitas' ? 'visita' : table === 'obras_ocorrencias' ? 'ocorrencia' : null;
      if (!navigator.onLine && entity) {
        await guardarOperacaoOffline(criarOperacaoOffline({ id: payload.id, userId: user.id, workspaceId: ws, entity, payload }));
        return payload;
      }
      try {
        const { data, error } = await supabase.from(table).insert(payload).select().single();
        if (error) throw error;
        return data;
      } catch (error) {
        if (!entity || !isFalhaDeLigacao(error)) throw error;
        await guardarOperacaoOffline(criarOperacaoOffline({ id: payload.id, userId: user.id, workspaceId: ws, entity, payload }));
        return payload;
      }
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

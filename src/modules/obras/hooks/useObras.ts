import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useObrasWorkspace } from './useObrasWorkspace';
import type { ObraInsert, VisitaInsert, OcorrenciaInsert, AcaoInsert } from '../types/obras';
import { useAuth } from '@/contexts/AuthContext';
import { criarOperacaoOffline, guardarOperacaoOffline, actualizarRegistoPendenteOffline, isFalhaDeLigacao, listarOperacoesOffline, guardarSnapshotOffline, obterSnapshotOffline, listarSnapshotsOffline } from '../offline/offlineStore';

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
        if (user?.id) await guardarSnapshotOffline({ userId: user.id, workspaceId: ws!, obraId: '__lista__', entity: 'obra', data }).catch(() => undefined);
        return data;
      } catch (error) {
        if (!isFalhaDeLigacao(error) || !user?.id) throw error;
        return await obterSnapshotOffline<any[]>(user.id, ws!, '__lista__', 'obra') ?? [];
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
        if (data && user?.id && ws) await guardarSnapshotOffline({ userId: user.id, workspaceId: ws, obraId: id!, entity: 'obra', data }).catch(() => undefined);
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
        if (user?.id && ws) await guardarSnapshotOffline({ userId: user.id, workspaceId: ws, obraId: obraId!, entity: 'visitas', data: remote }).catch(() => undefined);
      } catch (error) {
        if (!isFalhaDeLigacao(error)) throw error;
        if (user?.id && ws) remote = await obterSnapshotOffline<any[]>(user.id, ws, obraId!, 'visitas') ?? [];
      }
    } else if (user?.id && ws) {
      remote = await obterSnapshotOffline<any[]>(user.id, ws, obraId!, 'visitas') ?? [];
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
        if (user?.id && ws) await guardarSnapshotOffline({ userId: user.id, workspaceId: ws, obraId: obraId!, entity: 'ocorrencias', data: remote }).catch(() => undefined);
      } catch (error) {
        if (!isFalhaDeLigacao(error)) throw error;
        if (user?.id && ws) remote = await obterSnapshotOffline<any[]>(user.id, ws, obraId!, 'ocorrencias') ?? [];
      }
    } else if (user?.id && ws) {
      remote = await obterSnapshotOffline<any[]>(user.id, ws, obraId!, 'ocorrencias') ?? [];
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
      if (item) return item.payload as any;
      const cached = await obterSnapshotOffline<any[]>(user.id, ws, obraId!, 'ocorrencias');
      return cached?.find((row) => row.id === ocorrenciaId) ?? null;
    },
  });
}

export function useAcoes(obraId?: string) {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({ queryKey: ['obras_acoes', obraId], enabled: !!obraId, queryFn: async () => {
    try {
      const { data, error } = await supabase.from('obras_acoes').select('*').eq('obra_id', obraId!).order('created_at', { ascending: false });
      if (error) throw error;
      if (user?.id && ws) await guardarSnapshotOffline({ userId: user.id, workspaceId: ws, obraId: obraId!, entity: 'acoes', data: data ?? [] }).catch(() => undefined);
      return data;
    } catch (error) {
      if (!isFalhaDeLigacao(error) || !user?.id || !ws) throw error;
      return await obterSnapshotOffline<any[]>(user.id, ws, obraId!, 'acoes') ?? [];
    }
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
      if (item) return item.payload as any;
      const snapshots = await listarSnapshotsOffline(user.id, ws);
      for (const snapshot of snapshots.filter((item) => item.entity === 'visitas')) {
        const row = (snapshot.data as any[])?.find((entry) => entry.id === id);
        if (row) return row;
      }
      return null;
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

type EntidadeEditavel = 'visita' | 'ocorrencia';

export function useEditarRegistoOffline(entity: EntidadeEditavel) {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, obraId, changes }: { id: string; obraId: string; changes: Record<string, unknown> }) => {
      if (!ws || !user?.id) throw new Error('Sem espaço de trabalho ou sessão válida.');
      const table = entity === 'visita' ? 'obras_visitas' : 'obras_ocorrencias';
      const snapshotEntity = entity === 'visita' ? 'visitas' : 'ocorrencias';
      let base: Record<string, unknown> | undefined;
      const cached = await obterSnapshotOffline<any[]>(user.id, ws, obraId, snapshotEntity);
      base = cached?.find((row) => row.id === id);
      const pendingBeforeEdit = (await listarOperacoesOffline(user.id, ws)).find((operation) => operation.id === id && operation.entity === entity);
      if (pendingBeforeEdit?.operationType === 'create') {
        const merged = { ...pendingBeforeEdit.payload, ...changes, id, workspace_id: ws };
        await actualizarRegistoPendenteOffline({
          id, userId: user.id, workspaceId: ws, entity, payload: merged,
          basePayload: pendingBeforeEdit.basePayload ?? {},
        });
        window.dispatchEvent(new Event('fkt:offline-queue-changed'));
        return merged;
      }
      if (navigator.onLine) {
        try {
          const { data: current, error: readError } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
          if (readError) throw readError;
          if (!current || current.workspace_id !== ws) throw new Error('Registo não encontrado neste espaço de trabalho.');
          if (base) {
            const changed = Object.keys(changes).filter((key) =>
              !['updated_at', 'created_at'].includes(key) &&
              JSON.stringify(current[key] ?? null) !== JSON.stringify(base![key] ?? null),
            );
            if (changed.length) {
              await actualizarRegistoPendenteOffline({
                id, userId: user.id, workspaceId: ws, entity, payload: { ...changes, id, workspace_id: ws },
                basePayload: base,
              });
              throw new Error('Foi detectada uma alteração concorrente. A edição local foi preservada para resolução.');
            }
          }
          let update = supabase.from(table).update(changes as never).eq('id', id);
          if (current.updated_at) update = update.eq('updated_at', current.updated_at) as typeof update;
          const { data, error } = await update.select().maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('Conflito de edição: o registo foi alterado durante a gravação. Recarregue os dados antes de voltar a editar.');
          return data;
        } catch (error) {
          if (!isFalhaDeLigacao(error)) throw error;
        }
      }
      if (!base) throw new Error('Não existe uma versão anterior guardada neste dispositivo. Abra o registo enquanto está online antes de o editar offline.');
      await actualizarRegistoPendenteOffline({
        id, userId: user.id, workspaceId: ws, entity,
        payload: { ...changes, id, workspace_id: ws },
        basePayload: base,
      });
      window.dispatchEvent(new Event('fkt:offline-queue-changed'));
      return { ...base, ...changes, id, workspace_id: ws };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [entity === 'visita' ? 'obras_visitas' : 'obras_ocorrencias', variables.obraId] });
      qc.invalidateQueries({ queryKey: [entity === 'visita' ? 'obras_visita' : 'obras_ocorrencia', variables.obraId] });
    },
    onError: onErr,
  });
}

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

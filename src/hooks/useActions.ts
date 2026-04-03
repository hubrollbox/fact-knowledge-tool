import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Action } from '@/types';

export function useActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('actions')
      .select('*, dossier:dossiers(id, titulo)')
      .order('data', { ascending: true, nullsFirst: false });
    setActions((data as unknown as Action[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const createAction = async (dossier_id: string, titulo: string, data?: string) => {
    if (!user) return;
    await supabase.from('actions').insert({
      dossier_id,
      titulo: titulo.trim(),
      data: data || null,
      estado: 'ativo',
    });
    await fetchActions();
  };

  const updateAction = async (id: string, updates: { titulo?: string; data?: string | null; estado?: string }) => {
    await supabase.from('actions').update(updates).eq('id', id);
    await fetchActions();
  };

  const deleteAction = async (id: string) => {
    await supabase.from('actions').delete().eq('id', id);
    setActions(prev => prev.filter(a => a.id !== id));
  };

  const completeAction = async (id: string) => {
    await updateAction(id, { estado: 'concluido' });
  };

  return { actions, loading, fetchActions, createAction, updateAction, deleteAction, completeAction };
}

export function useDossierActions(dossierId: string) {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!user || !dossierId) return;
    setLoading(true);
    const { data } = await supabase
      .from('actions')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false });
    setActions((data as unknown as Action[]) || []);
    setLoading(false);
  }, [user, dossierId]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const createAction = async (titulo: string, data?: string) => {
    if (!user) return;
    await supabase.from('actions').insert({
      dossier_id: dossierId,
      titulo: titulo.trim(),
      data: data || null,
      estado: 'ativo',
    });
    await fetchActions();
  };

  const updateAction = async (id: string, updates: { titulo?: string; data?: string | null; estado?: string }) => {
    await supabase.from('actions').update(updates).eq('id', id);
    await fetchActions();
  };

  const deleteAction = async (id: string) => {
    await supabase.from('actions').delete().eq('id', id);
    setActions(prev => prev.filter(a => a.id !== id));
  };

  const completeAction = async (id: string) => {
    await updateAction(id, { estado: 'concluido' });
  };

  return { actions, loading, fetchActions, createAction, updateAction, deleteAction, completeAction };
}

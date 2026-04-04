import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Action } from '@/types';

export function useActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('actions')
        .select('*, dossier:dossiers(id, titulo)')
        .order('data', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setActions((data as unknown as Action[]) || []);
    } catch (e: any) {
      toast.error('Erro ao carregar ações');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const createAction = async (dossier_id: string, titulo: string, data?: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('actions').insert({
        dossier_id,
        titulo: titulo.trim(),
        data: data || null,
        estado: 'ativo',
      });
      if (error) throw error;
      await fetchActions();
    } catch {
      toast.error('Erro ao criar ação');
    }
  };

  const updateAction = async (id: string, updates: { titulo?: string; data?: string | null; estado?: string }) => {
    try {
      const { error } = await supabase.from('actions').update(updates).eq('id', id);
      if (error) throw error;
      await fetchActions();
    } catch {
      toast.error('Erro ao atualizar ação');
    }
  };

  const deleteAction = async (id: string) => {
    try {
      const { error } = await supabase.from('actions').delete().eq('id', id);
      if (error) throw error;
      setActions(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Erro ao eliminar ação');
    }
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
    if (!user || !dossierId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActions((data as unknown as Action[]) || []);
    } catch {
      toast.error('Erro ao carregar ações do dossier');
    } finally {
      setLoading(false);
    }
  }, [user, dossierId]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const createAction = async (titulo: string, data?: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('actions').insert({
        dossier_id: dossierId,
        titulo: titulo.trim(),
        data: data || null,
        estado: 'ativo',
      });
      if (error) throw error;
      await fetchActions();
    } catch {
      toast.error('Erro ao criar ação');
    }
  };

  const updateAction = async (id: string, updates: { titulo?: string; data?: string | null; estado?: string }) => {
    try {
      const { error } = await supabase.from('actions').update(updates).eq('id', id);
      if (error) throw error;
      await fetchActions();
    } catch {
      toast.error('Erro ao atualizar ação');
    }
  };

  const deleteAction = async (id: string) => {
    try {
      const { error } = await supabase.from('actions').delete().eq('id', id);
      if (error) throw error;
      setActions(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Erro ao eliminar ação');
    }
  };

  const completeAction = async (id: string) => {
    await updateAction(id, { estado: 'concluido' });
  };

  return { actions, loading, fetchActions, createAction, updateAction, deleteAction, completeAction };
}

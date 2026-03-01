import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDatabaseError } from '@/lib/error-utils';
import type { Processo } from '@/types';

export function useProcessos() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcessos = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('processos')
      .select(`*, cliente:clientes(id, nome)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) setError(formatDatabaseError(error));
    else setProcessos((data as unknown as Processo[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProcessos();
  }, [user]);

  return { processos, loading, error, refetch: fetchProcessos };
}

export function useProcesso(id: string | undefined) {
  const { user } = useAuth();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcesso = async () => {
    if (!id || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('processos')
      .select(`*, cliente:clientes(id, nome, email, telefone, morada)`)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) setError(formatDatabaseError(error));
    else setProcesso(data as unknown as Processo);
    setLoading(false);
  };

  useEffect(() => {
    fetchProcesso();
  }, [id, user]);

  return { processo, loading, error, refetch: fetchProcesso };
}

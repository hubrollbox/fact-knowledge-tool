import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDatabaseError } from '@/lib/error-utils';
import type { Dossier } from '@/types';

export function useDossiers() {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDossiers = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('dossiers')
      .select(`*, cliente:clientes(id, nome)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) setError(formatDatabaseError(error));
    else setDossiers((data as unknown as Dossier[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDossiers();
  }, [user]);

  return { dossiers, loading, error, refetch: fetchDossiers };
}

export function useDossier(id: string | undefined) {
  const { user } = useAuth();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDossier = async () => {
    if (!id || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('dossiers')
      .select(`*, cliente:clientes(id, nome, email, telefone, morada)`)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) setError(formatDatabaseError(error));
    else setDossier(data as unknown as Dossier);
    setLoading(false);
  };

  useEffect(() => {
    fetchDossier();
  }, [id, user]);

  return { dossier, loading, error, refetch: fetchDossier };
}

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  actualizarOperacaoOffline,
  listarOperacoesOffline,
  removerOperacaoOffline,
  type WorksOfflineOperation,
} from './offlineStore';

export function useWorksOfflineQueue(workspaceId: string | null) {
  const { user } = useAuth();
  const [operations, setOperations] = useState<WorksOfflineOperation[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id || !workspaceId) {
      setOperations([]);
      return;
    }
    try {
      setOperations(await listarOperacoesOffline(user.id, workspaceId));
    } catch {
      // Keep the UI usable; the caller can retry by refreshing the queue.
    }
  }, [user?.id, workspaceId]);

  const sync = useCallback(async () => {
    if (!user?.id || !workspaceId || !navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const pending = await listarOperacoesOffline(user.id, workspaceId);
      for (const operation of pending) {
        if (operation.userId !== user.id || operation.workspaceId !== workspaceId) continue;
        const table = operation.entity === 'visita'
          ? 'obras_visitas'
          : operation.entity === 'ocorrencia'
            ? 'obras_ocorrencias'
            : null;

        // Photograph records are deliberately not synced until their binary
        // upload workflow is implemented; never discard a queued photograph.
        if (!table) continue;

        try {
          const { error } = await supabase.from(table).upsert(
            operation.payload as never,
            { onConflict: 'id', ignoreDuplicates: true },
          );
          if (error) throw error;
          await removerOperacaoOffline(operation.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha de sincronização.';
          await actualizarOperacaoOffline(operation.id, {
            attempts: operation.attempts + 1,
            lastError: message,
          });
          // Preserve order: do not apply later dependent operations first.
          break;
        }
      }
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [user?.id, workspaceId, syncing, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => { void sync(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sync]);

  return { operations, pendingCount: operations.length, syncing, refresh, sync };
}

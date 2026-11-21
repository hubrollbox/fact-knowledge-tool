import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  actualizarOperacaoOffline,
  listarOperacoesOffline,
  removerOperacaoOffline,
  type WorksOfflineOperation,
} from './offlineStore';

function extension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  const fromMime = file.type.split('/')[1]?.toLowerCase();
  return fromMime && /^[a-z0-9.+-]{1,12}$/.test(fromMime) ? fromMime : 'jpg';
}

async function sincronizarFoto(operation: WorksOfflineOperation) {
  const file = operation.payload.file;
  if (!(file instanceof Blob)) throw new Error('A fotografia pendente não contém um ficheiro válido.');
  const id = String(operation.payload.photoId ?? operation.id);
  const path = operation.workspaceId + '/' + id + '.' + extension(file as File);
  const { error: uploadError } = await supabase.storage.from('obras-fotos').upload(path, file, {
    contentType: file.type || 'image/jpeg',
  });
  if (uploadError) {
    // A previous attempt may have uploaded the object before metadata failed.
    // Confirm that exact object exists instead of requiring Storage UPDATE rights.
    if (!/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
    const folder = operation.workspaceId;
    const filename = id + '.' + extension(file as File);
    const { data: existing, error: listError } = await supabase.storage.from('obras-fotos').list(folder, { search: filename });
    if (listError || !existing?.some((item) => item.name === filename)) throw uploadError;
  }

  const metadata = {
    id,
    workspace_id: operation.workspaceId,
    storage_path: path,
    visita_id: (operation.payload.visitaId as string | null) ?? null,
    ocorrencia_id: (operation.payload.ocorrenciaId as string | null) ?? null,
    legenda: (operation.payload.legenda as string | null) ?? null,
    capturada_em: String(operation.payload.capturadaEm ?? operation.createdAt),
    latitude: (operation.payload.latitude as number | null) ?? null,
    longitude: (operation.payload.longitude as number | null) ?? null,
  };
  const { error } = await supabase.from('obras_fotos').upsert(metadata, { onConflict: 'id' });
  if (error) throw error;
}

export function useWorksOfflineQueue(workspaceId: string | null) {
  const { user } = useAuth();
  const [operations, setOperations] = useState<WorksOfflineOperation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id || !workspaceId) { setOperations([]); return; }
    try { setOperations(await listarOperacoesOffline(user.id, workspaceId)); }
    catch { setOperations([]); }
  }, [user?.id, workspaceId]);

  const sync = useCallback(async () => {
    if (!user?.id || !workspaceId || !navigator.onLine || running.current) return;
    running.current = true;
    setSyncing(true);
    try {
      const pending = await listarOperacoesOffline(user.id, workspaceId);
      for (const operation of pending) {
        if (operation.userId !== user.id || operation.workspaceId !== workspaceId) continue;
        try {
          if (operation.entity === 'visita' || operation.entity === 'ocorrencia') {
            const table = operation.entity === 'visita' ? 'obras_visitas' : 'obras_ocorrencias';
            const { error } = await supabase.from(table).upsert(operation.payload as never, { onConflict: 'id' });
            if (error) throw error;
          } else {
            await sincronizarFoto(operation);
          }
          await removerOperacaoOffline(operation.id);
        } catch (error) {
          await actualizarOperacaoOffline(operation.id, {
            attempts: operation.attempts + 1,
            lastError: error instanceof Error ? error.message : 'Falha de sincronização.',
          });
          break;
        }
      }
    } finally {
      running.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [user?.id, workspaceId, refresh]);

  useEffect(() => { void refresh(); if (navigator.onLine) void sync(); }, [refresh, sync]);
  useEffect(() => {
    const onOnline = () => { void sync(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sync]);

  return { operations, pendingCount: operations.length, syncing, refresh, sync };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useObrasWorkspace } from './useObrasWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { criarOperacaoOffline, guardarOperacaoOffline, isFalhaDeLigacao, guardarFotoCacheOffline, listarFotosCacheOffline, listarOperacoesOffline, MAX_OFFLINE_PHOTO_CACHE_COUNT } from '../offline/offlineStore';

const MAX = 20 * 1024 * 1024;

export function useFotos(filtro: { visitaId?: string; ocorrenciaId?: string; ocorrenciaIds?: string[] }) {
  const key = filtro.visitaId ?? filtro.ocorrenciaId ?? filtro.ocorrenciaIds?.join(',');
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['obras_fotos', user?.id, ws, key],
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
    enabled: !!key && !!ws && !!user?.id,
    queryFn: async () => {
      if (!user?.id || !ws) throw new Error('Sem sessão ou espaço de trabalho para consultar fotografias.');
      const cached = await listarFotosCacheOffline(user.id, ws).catch(() => []);
      const cachedForFilter = cached.filter((photo) =>
        filtro.visitaId ? photo.visita_id === filtro.visitaId
          : filtro.ocorrenciaId ? photo.ocorrencia_id === filtro.ocorrenciaId
            : !!filtro.ocorrenciaIds?.includes(photo.ocorrencia_id ?? ''),
      );
      const pendingOperations = await listarOperacoesOffline(user.id, ws).catch(() => []);
      const pendingPhotos = pendingOperations
        .filter((operation) => operation.entity === 'foto')
        .filter((operation) => filtro.visitaId
          ? operation.payload.visitaId === filtro.visitaId
          : filtro.ocorrenciaId
            ? operation.payload.ocorrenciaId === filtro.ocorrenciaId
            : !!filtro.ocorrenciaIds?.includes(String(operation.payload.ocorrenciaId ?? '')))
        .map((operation) => ({
          id: operation.id,
          url: null,
          cachedBlob: operation.payload.file instanceof Blob ? operation.payload.file : null,
          legenda: (operation.payload.legenda as string | null) ?? null,
          capturada_em: (operation.payload.capturadaEm as string | null) ?? operation.createdAt,
          latitude: (operation.payload.latitude as number | null) ?? null,
          longitude: (operation.payload.longitude as number | null) ?? null,
          pending: true,
        }));
      if (!navigator.onLine) {
        return [
          ...cachedForFilter.map((photo) => ({ ...photo, url: null, cachedBlob: photo.blob, pending: false })),
          ...pendingPhotos,
        ].sort((a, b) => (b.capturada_em ?? '').localeCompare(a.capturada_em ?? ''));
      }
      try {
        let q = supabase.from('obras_fotos').select('*').order('capturada_em', { ascending: false });
        if (filtro.visitaId) q = q.eq('visita_id', filtro.visitaId);
        else if (filtro.ocorrenciaId) q = q.eq('ocorrencia_id', filtro.ocorrenciaId);
        else if (filtro.ocorrenciaIds?.length) q = q.in('ocorrencia_id', filtro.ocorrenciaIds);
        else return [];
        const { data, error } = await q;
        if (error) throw error;
        if (!data.length) return pendingPhotos;
        const paths = data.map((photo) => photo.storage_path);
        const { data: signed } = await supabase.storage.from('obras-fotos').createSignedUrls(paths, 300);
        const cacheCandidates = data.slice(0, MAX_OFFLINE_PHOTO_CACHE_COUNT);
        // Download in small batches and persist each blob immediately. Do not
        // retain the downloaded blobs in a second in-memory gallery-sized map.
        for (let offset = 0; offset < cacheCandidates.length; offset += 5) {
          const batch = cacheCandidates.slice(offset, offset + 5);
          await Promise.all(batch.map(async (photo) => {
            const { data: blob, error: downloadError } = await supabase.storage.from('obras-fotos').download(photo.storage_path);
            if (downloadError || !blob || blob.size <= 0 || blob.size > MAX) return;
            await guardarFotoCacheOffline({
              id: photo.id, userId: user.id, workspaceId: ws,
              visita_id: photo.visita_id, ocorrencia_id: photo.ocorrencia_id,
              legenda: photo.legenda, capturada_em: photo.capturada_em,
              latitude: photo.latitude, longitude: photo.longitude, blob,
            }).catch(() => undefined);
          }));
        }
        const remotePhotos = data.map((photo, i) => ({
          ...photo,
          url: signed?.[i]?.signedUrl ?? null,
          cachedBlob: cachedForFilter.find((cachedPhoto) => cachedPhoto.id === photo.id)?.blob ?? null,
          pending: false,
        }));
        const remoteIds = new Set(remotePhotos.map((photo) => photo.id));
        return [...remotePhotos, ...pendingPhotos.filter((photo) => !remoteIds.has(photo.id))]
          .sort((a, b) => (b.capturada_em ?? '').localeCompare(a.capturada_em ?? ''));
      } catch (error) {
        if (!isFalhaDeLigacao(error)) throw error;
        return [
          ...cachedForFilter.map((photo) => ({ ...photo, url: null, cachedBlob: photo.blob, pending: false })),
          ...pendingPhotos,
        ].sort((a, b) => (b.capturada_em ?? '').localeCompare(a.capturada_em ?? ''));
      }
    },
  });
}

function getPosicao(): Promise<{ lat: number; lng: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((res) =>
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { timeout: 5000, maximumAge: 60000 },
    ),
  );
}

export function useUploadFoto() {
  const ws = useObrasWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, visitaId, ocorrenciaId, legenda }: { file: File; visitaId?: string; ocorrenciaId?: string; legenda?: string }) => {
      if (!ws || !user?.id) throw new Error('Sem espaço de trabalho ou sessão válida');
      if (!file.type.startsWith('image/')) throw new Error('O ficheiro tem de ser uma imagem');
      if (file.size > MAX) throw new Error('A foto excede 20 MB');
      const pos = await getPosicao();
      const id = crypto.randomUUID();
      const capturedAt = new Date().toISOString();
      const metadata = {
        id, workspace_id: ws, visita_id: visitaId ?? null, ocorrencia_id: ocorrenciaId ?? null,
        legenda: legenda || null, capturada_em: capturedAt, latitude: pos?.lat ?? null, longitude: pos?.lng ?? null,
      };
      if (!navigator.onLine) {
        await guardarOperacaoOffline(criarOperacaoOffline({
          id, userId: user.id, workspaceId: ws, entity: 'foto',
          payload: { ...metadata, photoId: id, file, visitaId: visitaId ?? null, ocorrenciaId: ocorrenciaId ?? null, legenda: legenda ?? null, capturadaEm: capturedAt },
        }));
        return { queued: true };
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = ws + '/' + id + '.' + ext;
      const { error: upErr } = await supabase.storage.from('obras-fotos').upload(storagePath, file, { contentType: file.type });
      if (upErr) {
        if (!isFalhaDeLigacao(upErr)) throw upErr;
        await guardarOperacaoOffline(criarOperacaoOffline({
          id, userId: user.id, workspaceId: ws, entity: 'foto',
          payload: { ...metadata, photoId: id, file, visitaId: visitaId ?? null, ocorrenciaId: ocorrenciaId ?? null, legenda: legenda ?? null, capturadaEm: capturedAt },
        }));
        return { queued: true };
      }
      const { error } = await supabase.from('obras_fotos').insert({ ...metadata, storage_path: storagePath });
      if (error) {
        if (isFalhaDeLigacao(error)) {
          await guardarOperacaoOffline(criarOperacaoOffline({
            id, userId: user.id, workspaceId: ws, entity: 'foto',
            payload: { ...metadata, photoId: id, file, visitaId: visitaId ?? null, ocorrenciaId: ocorrenciaId ?? null, legenda: legenda ?? null, capturadaEm: capturedAt },
          }));
          return { queued: true };
        }
        await supabase.storage.from('obras-fotos').remove([storagePath]);
        throw error;
      }
      return { queued: false };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['obras_fotos'] });
      toast({ title: result?.queued ? 'Foto guardada no dispositivo' : 'Foto guardada', description: result?.queued ? 'Será enviada quando recuperar a ligação.' : undefined });
    },
    onError: (e: Error) => toast({ title: 'A foto não foi guardada', description: e.message, variant: 'destructive' }),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useObrasWorkspace } from './useObrasWorkspace';

const MAX = 20 * 1024 * 1024;

export function useFotos(filtro: { visitaId?: string; ocorrenciaId?: string }) {
  const key = filtro.visitaId ?? filtro.ocorrenciaId;
  return useQuery({
    queryKey: ['obras_fotos', key],
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
    enabled: !!key,
    queryFn: async () => {
      let q = supabase.from('obras_fotos').select('*').order('capturada_em', { ascending: false });
      q = filtro.visitaId ? q.eq('visita_id', filtro.visitaId) : q.eq('ocorrencia_id', filtro.ocorrenciaId!);
      const { data, error } = await q;
      if (error) throw error;
      const paths = data.map((f) => f.storage_path);
      if (!paths.length) return [];
      const { data: signed } = await supabase.storage.from('obras-fotos').createSignedUrls(paths, 300);
      return data.map((f, i) => ({ ...f, url: signed?.[i]?.signedUrl ?? null }));
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, visitaId, ocorrenciaId, legenda }: { file: File; visitaId?: string; ocorrenciaId?: string; legenda?: string }) => {
      if (!ws) throw new Error('Sem espaço de trabalho');
      if (!file.type.startsWith('image/')) throw new Error('O ficheiro tem de ser uma imagem');
      if (file.size > MAX) throw new Error('A foto excede 20 MB');
      const pos = await getPosicao();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${ws}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('obras-fotos').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from('obras_fotos').insert({
        workspace_id: ws, storage_path: path, visita_id: visitaId ?? null, ocorrencia_id: ocorrenciaId ?? null,
        legenda: legenda || null, capturada_em: new Date().toISOString(), latitude: pos?.lat ?? null, longitude: pos?.lng ?? null,
      });
      if (error) { await supabase.storage.from('obras-fotos').remove([path]); throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras_fotos'] }); toast({ title: 'Foto guardada' }); },
    onError: (e: Error) => toast({ title: 'A foto não foi guardada', description: e.message, variant: 'destructive' }),
  });
}

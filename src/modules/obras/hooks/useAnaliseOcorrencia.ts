import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useObrasWorkspace } from './useObrasWorkspace';
import type {
  AnaliseOcorrenciaInsert,
  FactoOcorrenciaInsert,
  ReferenciaOcorrenciaInsert,
} from '../types/obras';

const onErr = (error: Error) =>
  toast({ title: 'Não foi guardado', description: error.message, variant: 'destructive' });

export async function fetchAnaliseOcorrencia(ocorrenciaId: string) {
  const { data: analise, error } = await supabase
    .from('obras_ocorrencia_analises')
    .select('*')
    .eq('ocorrencia_id', ocorrenciaId)
    .maybeSingle();
  if (error) throw error;
  if (!analise) return { analise: null, factos: [], referencias: [], versoes: [], documentos: [] };

  const [factosResult, referenciasResult] = await Promise.all([
    supabase.from('obras_ocorrencia_factos').select('*').eq('analise_id', analise.id).order('created_at'),
    supabase.from('obras_ocorrencia_referencias').select('*').eq('analise_id', analise.id).order('created_at'),
  ]);
  if (factosResult.error) throw factosResult.error;
  if (referenciasResult.error) throw referenciasResult.error;

  const versaoIds = [...new Set((referenciasResult.data ?? []).map((ref) => ref.documento_versao_id).filter((id): id is string => !!id))];
  const versoesResult = versaoIds.length
    ? await supabase.from('obras_documento_versoes').select('id, documento_id, numero_versao, nome_ficheiro, storage_path').in('id', versaoIds)
    : { data: [], error: null };
  if (versoesResult.error) throw versoesResult.error;

  const versoesBase = versoesResult.data ?? [];
  const paths = versoesBase.map((version) => version.storage_path);
  const signedResult = paths.length
    ? await supabase.storage.from('obras-documentos').createSignedUrls(paths, 900)
    : { data: [], error: null };
  if (signedResult.error) throw signedResult.error;
  const signedByPath = new Map((signedResult.data ?? []).map((item) => [item.path, item.signedUrl]));
  const versoes = versoesBase.map((version) => ({ ...version, signedUrl: signedByPath.get(version.storage_path) ?? null }));

  const documentoIds = [...new Set(versoes.map((version) => version.documento_id))];
  const documentosResult = documentoIds.length
    ? await supabase.from('obras_documentos').select('id, titulo').in('id', documentoIds)
    : { data: [], error: null };
  if (documentosResult.error) throw documentosResult.error;

  return {
    analise,
    factos: factosResult.data ?? [],
    referencias: referenciasResult.data ?? [],
    versoes,
    documentos: documentosResult.data ?? [],
  };
}

export function useAnaliseOcorrencia(ocorrenciaId: string) {
  return useQuery({
    queryKey: ['obras_ocorrencia_analise', ocorrenciaId],
    enabled: !!ocorrenciaId,
    queryFn: () => fetchAnaliseOcorrencia(ocorrenciaId),
  });
}

type AnaliseValues = Pick<
  AnaliseOcorrenciaInsert,
  'interpretacao' | 'conclusao' | 'recomendacao' | 'informacao_em_falta'
>;

export function useGuardarAnaliseOcorrencia() {
  const qc = useQueryClient();
  const ws = useObrasWorkspace();
  return useMutation({
    mutationFn: async ({
      ocorrenciaId,
      analiseId,
      values,
    }: { ocorrenciaId: string; analiseId?: string; values: AnaliseValues }) => {
      if (analiseId) {
        const { data, error } = await supabase
          .from('obras_ocorrencia_analises')
          .update(values)
          .eq('id', analiseId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      if (!ws) throw new Error('Sem espaço de trabalho');
      const { data, error } = await supabase
        .from('obras_ocorrencia_analises')
        .insert({ ...values, ocorrencia_id: ocorrenciaId, workspace_id: ws })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia_analise', variables.ocorrenciaId] });
      toast({ title: 'Análise guardada' });
    },
    onError: onErr,
  });
}

type FactoValues = Pick<
  FactoOcorrenciaInsert,
  'descricao' | 'estado' | 'evidencia_foto_id' | 'referencia_id'
>;

export function useAdicionarFactoOcorrencia() {
  const qc = useQueryClient();
  const ws = useObrasWorkspace();
  return useMutation({
    mutationFn: async ({
      ocorrenciaId,
      analiseId,
      values,
    }: { ocorrenciaId: string; analiseId: string; values: FactoValues }) => {
      if (!ws) throw new Error('Sem espaço de trabalho');
      const { data, error } = await supabase
        .from('obras_ocorrencia_factos')
        .insert({ ...values, analise_id: analiseId, ocorrencia_id: ocorrenciaId, workspace_id: ws })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia_analise', variables.ocorrenciaId] }),
    onError: onErr,
  });
}

export function useActualizarFactoOcorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: { id: string; ocorrenciaId: string; values: Partial<FactoValues> }) => {
      const { data, error } = await supabase
        .from('obras_ocorrencia_factos')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia_analise', variables.ocorrenciaId] }),
    onError: onErr,
  });
}

export function useEliminarFactoOcorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; ocorrenciaId: string }) => {
      const { error } = await supabase.from('obras_ocorrencia_factos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia_analise', variables.ocorrenciaId] }),
    onError: onErr,
  });
}

type ReferenciaValues = Pick<
  ReferenciaOcorrenciaInsert,
  'tipo' | 'titulo' | 'entidade_origem' | 'identificador' | 'versao' | 'data_documento' | 'url' | 'notas' | 'documento_versao_id'
>;

export function useGuardarReferenciaOcorrencia() {
  const qc = useQueryClient();
  const ws = useObrasWorkspace();
  return useMutation({
    mutationFn: async ({
      ocorrenciaId,
      analiseId,
      referenciaId,
      values,
    }: { ocorrenciaId: string; analiseId: string; referenciaId?: string; values: ReferenciaValues }) => {
      if (referenciaId) {
        const { data, error } = await supabase
          .from('obras_ocorrencia_referencias')
          .update(values)
          .eq('id', referenciaId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      if (!ws) throw new Error('Sem espaço de trabalho');
      const { data, error } = await supabase
        .from('obras_ocorrencia_referencias')
        .insert({ ...values, analise_id: analiseId, ocorrencia_id: ocorrenciaId, workspace_id: ws })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia_analise', variables.ocorrenciaId] });
      toast({ title: 'Referência guardada' });
    },
    onError: onErr,
  });
}

export function useEliminarReferenciaOcorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; ocorrenciaId: string }) => {
      const { error } = await supabase.from('obras_ocorrencia_referencias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia_analise', variables.ocorrenciaId] }),
    onError: onErr,
  });
}
